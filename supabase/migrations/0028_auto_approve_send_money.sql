-- Send Money: Premium switches on as soon as the TrxID is submitted ("active within 1 minute").
-- The admin then matches the TrxID in the bKash/Nagad app and either confirms it or cancels a fake one,
-- which revokes the access. Set manual_payment.auto_approve = false to go back to approving by hand.
update public.app_settings set value = value || '{"auto_approve": true}'::jsonb where key = 'manual_payment';

create or replace function public.submit_manual_payment(
  p_plan text, p_test int, p_coupon text, p_method text, p_sender text, p_trx text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); q jsonb; cfg jsonb; pid uuid; payload jsonb;
        trx text := upper(regexp_replace(coalesce(p_trx,''), '\s', '', 'g'));
        sender text := regexp_replace(coalesce(p_sender,''), '[\s-]', '', 'g');
begin
  if uid is null then raise exception 'auth_required'; end if;
  if not public.rate_ok('manual_payment', 10, interval '1 hour') then raise exception 'rate_limited'; end if;
  select value into cfg from public.app_settings where key = 'manual_payment';
  if cfg is null or not coalesce((cfg->>'enabled')::boolean, false) then raise exception 'manual_disabled'; end if;
  if p_method not in ('bkash','nagad') or coalesce(cfg->>p_method, '') = '' then raise exception 'bad_method'; end if;
  if trx !~ '^[A-Z0-9]{8,12}$' then raise exception 'bad_trx'; end if;
  if sender !~ '^(\+?88)?01[3-9][0-9]{8}$' then raise exception 'bad_sender'; end if;
  if p_plan = 'lifetime' and public.has_premium(uid) then raise exception 'already_premium'; end if;
  if p_plan = 'single_test' and exists (select 1 from public.subscriptions where user_id = uid and plan = 'single_test'
       and mock_test_id = p_test and status = 'active') then raise exception 'already_owned'; end if;
  if (select count(*) from public.payments where user_id = uid and gateway = 'manual' and status = 'pending') >= 3 then
    raise exception 'too_many_pending'; end if;
  -- a user whose earlier TrxID turned out fake doesn't get instant access again
  if exists (select 1 from public.payments where gateway = 'manual' and gateway_txn_id = trx) then raise exception 'trx_used'; end if;

  q := public.quote_price(p_plan, case when p_plan = 'single_test' then p_test end, p_coupon);
  payload := jsonb_strip_nulls(jsonb_build_object('method', p_method, 'sender', sender, 'paid_to', cfg->>p_method, 'submitted_at', now(),
    'offer', q->>'offer', 'referrer', q->>'referrer_id', 'code', nullif(upper(trim(coalesce(p_coupon,''))), '')));
  insert into public.payments (user_id, plan, mock_test_id, amount, original_amount, coupon_id, gateway, status, gateway_txn_id, gateway_payload)
  values (uid, p_plan, case when p_plan = 'single_test' then p_test end, (q->>'amount')::numeric, (q->>'base')::numeric,
          nullif(q->>'coupon_id','')::int, 'manual', 'pending', trx, payload)
  returning id into pid;

  if coalesce((cfg->>'auto_approve')::boolean, false)
     and not exists (select 1 from public.payments where user_id = uid and gateway = 'manual'
                     and gateway_payload->>'fake' = 'true') then
    perform public.grant_payment(pid, trx, payload || jsonb_build_object('auto_approved', true));
  end if;
  return pid;
end $$;

-- Admin: after matching in the bKash/Nagad app, confirm a genuine auto-approved payment or cancel a fake one
create or replace function public.admin_check_auto_payment(p_payment uuid, p_genuine boolean)
returns text language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'not_found'; end if;
  if p_genuine then
    update public.payments set gateway_payload = coalesce(gateway_payload, '{}'::jsonb)
      || jsonb_build_object('checked_by', auth.uid(), 'checked_at', now()) where id = p_payment;
    return 'checked';
  end if;
  update public.payments set status = 'failed', gateway_payload = coalesce(gateway_payload, '{}'::jsonb)
    || jsonb_build_object('fake', true, 'checked_by', auth.uid(), 'checked_at', now()) where id = p_payment;
  update public.subscriptions set status = 'revoked' where payment_id = p_payment;
  if p.coupon_id is not null and p.status = 'paid' then
    update public.coupons set used_count = greatest(used_count - 1, 0) where id = p.coupon_id;
  end if;
  return 'revoked';
end $$;
revoke all on function public.admin_check_auto_payment(uuid, boolean) from public, anon;
grant execute on function public.admin_check_auto_payment(uuid, boolean) to authenticated;
