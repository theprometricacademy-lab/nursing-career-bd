-- Admin can approve a Send Money payment that was rejected by mistake (or marked fake by mistake):
-- the payment goes back to pending, then is granted as usual.
create or replace function public.admin_review_payment(p_payment uuid, p_approve boolean, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'not_found'; end if;
  if p_approve and p.status = 'failed' and p.gateway = 'manual' then
    -- undo the earlier rejection; drop the "fake" mark so this user's later payments are treated normally again
    update public.payments set status = 'pending',
      gateway_payload = (coalesce(gateway_payload, '{}'::jsonb) - 'fake')
        || jsonb_build_object('reopened_by', auth.uid(), 'reopened_at', now())
    where id = p.id;
    -- it had been auto-activated and then revoked as fake: switch that same access back on
    if exists (select 1 from public.subscriptions where payment_id = p.id) then
      update public.subscriptions set status = 'active' where payment_id = p.id;
      update public.payments set status = 'paid', verified_at = now(),
        gateway_payload = gateway_payload || jsonb_build_object('approved_by', auth.uid(), 'approved_at', now(), 'note', p_note)
      where id = p.id;
      if p.coupon_id is not null then
        update public.coupons set used_count = used_count + 1 where id = p.coupon_id;
      end if;
      return 'paid';
    end if;
    select * into p from public.payments where id = p_payment;
  end if;
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
revoke all on function public.admin_review_payment(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_payment(uuid, boolean, text) to authenticated;
