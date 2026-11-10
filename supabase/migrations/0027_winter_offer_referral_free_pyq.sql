-- 1) Winter offer: Lifetime Premium for ৳399 (৳200 off ৳599) for the first 100 buyers.
--    A coupon or referral code replaces the offer: its discount is taken off the full ৳599.
-- 2) Referral: every user has a code; a friend who uses it gets ৳50 off (from ৳599).
-- 3) Previous-year questions (real past papers) are free for everyone, so their exam-mode tests are free too.

insert into public.app_settings (key, value, is_public) values
  ('winter_offer', '{"enabled": true, "price": 399, "limit": 100}', true),
  ('referral_discount', '50', true)
on conflict (key) do nothing;

-- Seats taken = paid Lifetime purchases made at the offer price
create or replace function public.winter_offer_status()
returns jsonb language sql stable security definer set search_path = public as $$
  with cfg as (select value v from public.app_settings where key = 'winter_offer'),
       used as (select count(*) n from public.payments
                where plan = 'lifetime' and status = 'paid' and gateway_payload->>'offer' = 'winter')
  select jsonb_build_object(
    'enabled', coalesce((v->>'enabled')::boolean, false),
    'price', (v->>'price')::numeric,
    'limit', (v->>'limit')::int,
    'used', used.n,
    'left', greatest((v->>'limit')::int - used.n, 0),
    'active', coalesce((v->>'enabled')::boolean, false) and used.n < (v->>'limit')::int)
  from cfg, used
$$;
revoke all on function public.winter_offer_status() from public;
grant execute on function public.winter_offer_status() to anon, authenticated;

-- Referral codes: NC + 6 characters, one per user
alter table public.profiles add column if not exists referral_code text;
update public.profiles set referral_code = 'NC' || upper(substr(md5(id::text), 1, 6)) where referral_code is null;
create unique index if not exists profiles_referral_code_key on public.profiles (referral_code);
create or replace function public.set_referral_code() returns trigger language plpgsql as $$
begin
  if new.referral_code is null then new.referral_code := 'NC' || upper(substr(md5(new.id::text), 1, 6)); end if;
  return new;
end $$;
drop trigger if exists profiles_referral_code on public.profiles;
create trigger profiles_referral_code before insert on public.profiles for each row execute function public.set_referral_code();

create or replace function public.quote_price(p_plan text, p_test integer default null, p_coupon text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare base numeric; c public.coupons; disc numeric := 0; ref uuid; w jsonb; offer text;
begin
  if p_plan = 'lifetime' then
    base := (select (value)::text::numeric from public.app_settings where key = 'price_lifetime');
  elsif p_plan = 'single_test' then
    if not exists (select 1 from public.mock_tests where id = p_test and is_premium) then raise exception 'not_premium_test'; end if;
    base := coalesce((select price from public.mock_tests where id = p_test),
                     (select (value)::text::numeric from public.app_settings where key = 'price_single_test'));
  else raise exception 'bad_plan'; end if;

  if p_coupon is not null and p_coupon <> '' then
    select * into c from public.coupons where upper(code) = upper(p_coupon) and is_active
      and (expires_at is null or expires_at > now()) and (max_uses is null or used_count < max_uses);
    if found then
      disc := case when c.discount_type = 'percent' then round(base * least(c.value,100) / 100, 0) else least(c.value, base) end;
    else
      -- a friend's referral code (not your own)
      select id into ref from public.profiles where referral_code = upper(trim(p_coupon)) and id is distinct from auth.uid();
      if ref is not null then
        disc := least(coalesce((select (value)::text::numeric from public.app_settings where key = 'referral_discount'), 50), base);
        offer := 'referral';
      end if;
    end if;
  end if;

  -- no coupon/referral: the winter offer applies to Lifetime while seats are left
  if p_plan = 'lifetime' and c.id is null and ref is null then
    w := public.winter_offer_status();
    if (w->>'active')::boolean and (w->>'price')::numeric < base then
      disc := base - (w->>'price')::numeric; offer := 'winter';
    end if;
  end if;

  return jsonb_build_object('base', base, 'discount', disc, 'amount', greatest(base - disc, 0),
                            'coupon_id', c.id, 'coupon_valid', c.id is not null or ref is not null,
                            'offer', offer, 'referrer_id', ref);
end $$;

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
          jsonb_strip_nulls(jsonb_build_object('method', p_method, 'sender', sender, 'paid_to', cfg->>p_method, 'submitted_at', now(),
            'offer', q->>'offer', 'referrer', q->>'referrer_id', 'code', nullif(upper(trim(coalesce(p_coupon,''))), ''))))
  returning id into pid;
  return pid;
end $$;

-- the payload stays when an admin approves (grant_payment replaces it), so keep offer/referrer on approval
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

-- Previous-year questions free: real past papers (not the two "নমুনা" sample sets) and the "বিগত প্রশ্ন" topics
update public.questions q set is_premium = false, updated_at = now()
where q.is_premium and (
  (q.exam_id is not null and q.exam_id in (select id from public.exams where name_bn not like '%নমুনা%'))
  or q.topic_id in (select id from public.topics where name_bn like 'বিগত প্রশ্ন%'));
