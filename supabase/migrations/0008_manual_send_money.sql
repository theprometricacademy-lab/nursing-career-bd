-- Manual "Send Money" payments: student pays to the admin's bKash/Nagad number and submits the TrxID;
-- an admin checks it against the bKash/Nagad app and approves. Price is always computed in the database.

insert into public.app_settings (key, value, is_public) values
 ('manual_payment', '{"enabled": true, "bkash": "", "nagad": "", "account_type": "Personal"}', true)
on conflict (key) do nothing;

create or replace function public.submit_manual_payment(
  p_plan text, p_test int, p_coupon text, p_method text, p_sender text, p_trx text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); q jsonb; cfg jsonb; pid uuid; trx text := upper(regexp_replace(coalesce(p_trx,''), '\s', '', 'g'));
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
  if exists (select 1 from public.payments where gateway = 'manual' and gateway_txn_id = trx) then raise exception 'trx_used'; end if;

  q := public.quote_price(p_plan, case when p_plan = 'single_test' then p_test end, p_coupon);
  insert into public.payments (user_id, plan, mock_test_id, amount, original_amount, coupon_id, gateway, status, gateway_txn_id, gateway_payload)
  values (uid, p_plan, case when p_plan = 'single_test' then p_test end, (q->>'amount')::numeric, (q->>'base')::numeric,
          nullif(q->>'coupon_id','')::int, 'manual', 'pending', trx,
          jsonb_build_object('method', p_method, 'sender', sender, 'paid_to', cfg->>p_method, 'submitted_at', now()))
  returning id into pid;
  return pid;
end $$;

create or replace function public.admin_review_payment(p_payment uuid, p_approve boolean, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'not_found'; end if;
  if p.status <> 'pending' then return p.status; end if;
  if p_approve then
    perform public.grant_payment(p.id, coalesce(p.gateway_txn_id, 'MANUAL-'||left(p.id::text, 8)),
      coalesce(p.gateway_payload, '{}'::jsonb) || jsonb_build_object('approved_by', auth.uid(), 'approved_at', now(), 'note', p_note));
    return 'paid';
  else
    update public.payments set status = 'failed',
      gateway_payload = coalesce(gateway_payload, '{}'::jsonb) || jsonb_build_object('rejected_by', auth.uid(), 'rejected_at', now(), 'note', p_note)
    where id = p_payment;
    return 'failed';
  end if;
end $$;

revoke execute on function public.submit_manual_payment(text,int,text,text,text,text) from public, anon;
grant execute on function public.submit_manual_payment(text,int,text,text,text,text) to authenticated;
revoke execute on function public.admin_review_payment(uuid,boolean,text) from public, anon;
grant execute on function public.admin_review_payment(uuid,boolean,text) to authenticated;
