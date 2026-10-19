-- BUE Theatre Team website: attendance totals per actor for the staff Actors page.
-- Run this in the Supabase SQL editor AFTER 0003_forms.sql.
-- Done in the database because the API returns at most 1000 rows per request.

create or replace function public.actor_stats()
returns table (
  actor_id uuid,
  present  int,
  late     int,
  excused  int,
  absent   int
)
language sql stable security definer set search_path = public
as $$
  select a.actor_id,
         count(*) filter (where a.status = 'present')::int,
         count(*) filter (where a.status = 'late')::int,
         count(*) filter (where a.status = 'excused')::int,
         count(*) filter (where a.status = 'absent')::int
  from public.attendance a
  where public.is_staff()
  group by a.actor_id;
$$;

revoke all on function public.actor_stats() from public;
grant execute on function public.actor_stats() to authenticated;
