-- A coupon flagged "featured" is advertised on the home-page notice board.
alter table public.coupons add column if not exists featured boolean not null default false;
create or replace function public.public_featured_coupon()
returns table (code text, discount_type text, value numeric, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.code, c.discount_type, c.value, c.expires_at from public.coupons c
  where c.is_active and c.featured and (c.expires_at is null or c.expires_at > now())
    and (c.max_uses is null or c.used_count < c.max_uses)
  order by c.id desc limit 1
$$;
revoke all on function public.public_featured_coupon() from public;
grant execute on function public.public_featured_coupon() to anon, authenticated;
