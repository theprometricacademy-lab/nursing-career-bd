-- Weekly-test winner cards for Facebook.
--  * profiles.show_on_board: the user's own consent to show their full name / photo on the public winner card
--    (off by default; without it the card shows a masked name and no photo).
--  * profiles.avatar_path: optional profile photo in the public "avatars" bucket, always inside the user's own folder.
--  * weekly_winners(): admin-only — top 10 of a week, ready for the card.
--  * my_weekly_results(): the signed-in user's own rank this week and last week, for their personal share card.

alter table public.profiles add column if not exists show_on_board boolean not null default false;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles drop constraint if exists profiles_avatar_path_own;
alter table public.profiles add constraint profiles_avatar_path_own
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9._-]{1,60}$'));
grant update (show_on_board, avatar_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 524288, allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png'];

drop policy if exists avatars_own_select on storage.objects;
drop policy if exists avatars_own_insert on storage.objects;
drop policy if exists avatars_own_delete on storage.objects;
create policy avatars_own_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Ranking of one week, same rule as the weekly-test page: score, then time taken, then who finished first.
create or replace function public.weekly_board(p_week date)
returns table (user_id uuid, rk bigint, score numeric, max_score numeric, correct int, mins int)
language sql stable security definer set search_path = public as $$
  select t.user_id,
         row_number() over (order by t.score desc, t.submitted_at - t.started_at, t.submitted_at),
         t.score, t.max_score, t.correct,
         greatest(1, round(extract(epoch from (t.submitted_at - t.started_at)) / 60))::int
  from (select distinct on (a.user_id) a.* from test_attempts a
        where a.mode = 'weekly' and a.status = 'submitted' and a.week_start = p_week
        order by a.user_id, a.started_at) t
$$;
revoke all on function public.weekly_board(date) from public, anon, authenticated;

-- "রহিমা খাতুন" -> "র*** খা***" style mask (first letter of up to two words)
create or replace function public.mask_name(p text)
returns text language sql immutable as $$
  select coalesce(nullif(array_to_string(array(
           select left(w, 1) || '***' from unnest((regexp_split_to_array(trim(coalesce(p, '')), '\s+'))[1:2]) w where w <> ''), ' '), ''), 'সদস্য')
$$;

create or replace function public.weekly_winners(p_week date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare wk date := coalesce(p_week, bd_week_start(now()) - 7);
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  perform finalize_attempt(t.id) from test_attempts t
  where t.mode = 'weekly' and t.status = 'in_progress' and t.expires_at < now() and t.week_start = wk;
  return jsonb_build_object(
    'week_start', wk,
    'final', wk < bd_week_start(now()),
    'participants', (select count(*) from weekly_board(wk)),
    'top', coalesce((select jsonb_agg(jsonb_build_object(
              'rank', b.rk, 'score', b.score, 'max', b.max_score, 'correct', b.correct, 'mins', b.mins,
              'consent', coalesce(p.show_on_board, false),
              'name', case when p.show_on_board and nullif(trim(p.full_name), '') is not null then left(trim(p.full_name), 40) else mask_name(p.full_name) end,
              'avatar', case when p.show_on_board then p.avatar_path end) order by b.rk)
            from weekly_board(wk) b left join profiles p on p.id = b.user_id where b.rk <= 10), '[]'::jsonb));
end $$;
revoke all on function public.weekly_winners(date) from public, anon;
grant execute on function public.weekly_winners(date) to authenticated;

create or replace function public.my_weekly_results()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); wk date := bd_week_start(now());
begin
  if uid is null then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('week_start', w, 'final', w < wk, 'rank', b.rk, 'participants', (select count(*) from weekly_board(w)),
                                        'score', b.score, 'max', b.max_score, 'correct', b.correct, 'mins', b.mins) order by w desc)
    from unnest(array[wk, wk - 7]) w join lateral weekly_board(w) b on b.user_id = uid), '[]'::jsonb);
end $$;
revoke all on function public.my_weekly_results() from public, anon;
grant execute on function public.my_weekly_results() to authenticated;
alter function public.mask_name(text) set search_path = public;
