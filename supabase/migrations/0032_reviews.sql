-- Reviews from Premium members. Shown publicly only after an admin approves them.
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 600),
  display_name text check (char_length(display_name) <= 40),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviews_status_idx on public.reviews (status, created_at desc);
alter table public.reviews enable row level security;

drop policy if exists reviews_admin_all on public.reviews;
create policy reviews_admin_all on public.reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists reviews_own_select on public.reviews;
create policy reviews_own_select on public.reviews for select to authenticated
  using (user_id = (select auth.uid()));

-- A Premium member writes or edits their review; an edit goes back to review
create or replace function public.submit_review(p_rating int, p_body text, p_name text default null)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); b text := btrim(coalesce(p_body, '')); n text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if uid is null then raise exception 'login_required'; end if;
  if not public.has_premium(uid) then raise exception 'premium_only'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'bad_rating'; end if;
  if char_length(b) < 10 then raise exception 'too_short'; end if;
  insert into public.reviews (user_id, rating, body, display_name)
  values (uid, p_rating, left(b, 600), left(n, 40))
  on conflict (user_id) do update set rating = excluded.rating, body = excluded.body, display_name = excluded.display_name,
    status = 'pending', updated_at = now();
  return 'ok';
end $$;
revoke all on function public.submit_review(int, text, text) from public, anon;
grant execute on function public.submit_review(int, text, text) to authenticated;

-- Approved reviews for everyone (no user ids; name as the member chose, else first name from the profile)
create or replace function public.public_reviews(p_limit int default 12)
returns table (id bigint, rating smallint, body text, name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.body,
         coalesce(r.display_name, nullif(split_part(btrim(coalesce(p.full_name, '')), ' ', 1), ''), 'প্রিমিয়াম সদস্য'),
         r.created_at
  from public.reviews r left join public.profiles p on p.id = r.user_id
  where r.status = 'approved'
  order by r.rating desc, r.created_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;
revoke all on function public.public_reviews(int) from public;
grant execute on function public.public_reviews(int) to anon, authenticated;
