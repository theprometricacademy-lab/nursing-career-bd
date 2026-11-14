-- Admin dashboard: who is on the site right now (seen in the last 2 minutes; the page pings every 30 s).
create or replace function public.admin_live() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka';
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return (
    with v as (
      select distinct on (p.visitor_id) p.visitor_id, p.user_id, p.device
      from public.page_views p where p.last_seen > now() - interval '2 minutes'
      order by p.visitor_id, p.last_seen desc)
    select jsonb_build_object(
      'live', count(*),
      'app', count(*) filter (where v.device like '%অ্যাপ%'),
      'members', count(distinct v.user_id),
      'guests', count(*) filter (where v.user_id is null),
      'members_today', (select count(distinct p.user_id) from public.page_views p where p.started_at >= day_start and p.user_id is not null),
      'visitors_today', (select count(distinct p.visitor_id) from public.page_views p where p.started_at >= day_start))
    from v);
end $$;
revoke all on function public.admin_live() from public, anon;
grant execute on function public.admin_live() to authenticated;
