-- A code must never make Lifetime dearer than buying with no code.
-- Before: with the winter offer running (e.g. 499), a 10% coupon was taken off the full price (599 -> 539), so
-- using the coupon cost MORE than not using it. Now a coupon is taken off the price the customer would pay
-- anyway (the winter price while that offer runs: 499 -> 449), and a referral code is never dearer than the offer.

create or replace function public.quote_price(p_plan text, p_test integer default null, p_coupon text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare base numeric; c public.coupons; disc numeric := 0; ref uuid; w jsonb; offer text;
        wp numeric;   -- winter price for Lifetime while seats are left, else null
        eff numeric;  -- the price a coupon is taken off
begin
  if p_plan = 'lifetime' then
    base := (select (value)::text::numeric from public.app_settings where key = 'price_lifetime');
  elsif p_plan = 'single_test' then
    if not exists (select 1 from public.mock_tests where id = p_test and is_premium) then raise exception 'not_premium_test'; end if;
    base := coalesce((select price from public.mock_tests where id = p_test),
                     (select (value)::text::numeric from public.app_settings where key = 'price_single_test'));
  else raise exception 'bad_plan'; end if;

  if p_plan = 'lifetime' then
    w := public.winter_offer_status();
    if (w->>'active')::boolean and (w->>'price')::numeric < base then wp := (w->>'price')::numeric; end if;
  end if;
  eff := coalesce(wp, base);

  if p_coupon is not null and p_coupon <> '' then
    select * into c from public.coupons where upper(code) = upper(p_coupon) and is_active
      and (expires_at is null or expires_at > now()) and (max_uses is null or used_count < max_uses);
    if found then
      disc := (base - eff)
            + case when c.discount_type = 'percent' then round(eff * least(c.value, 100) / 100, 0) else least(c.value, eff) end;
    else
      select id into ref from public.profiles where referral_code = upper(trim(p_coupon)) and id is distinct from auth.uid();
      if ref is not null then
        disc := least(coalesce((select (value)::text::numeric from public.app_settings where key = 'referral_discount'), 50), base);
        disc := greatest(disc, base - eff);   -- never dearer than the running offer
        offer := 'referral';
      end if;
    end if;
  end if;

  if wp is not null and c.id is null and ref is null then
    disc := base - wp; offer := 'winter';
  end if;

  return jsonb_build_object('base', base, 'discount', disc, 'amount', greatest(base - disc, 0),
                            'coupon_id', c.id, 'coupon_valid', c.id is not null or ref is not null,
                            'offer', offer, 'referrer_id', ref);
end $$;
