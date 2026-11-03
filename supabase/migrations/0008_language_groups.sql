-- BUE Theatre Team website: English and Arabic groups.
-- Run this in the Supabase SQL editor AFTER 0007_team_groups.sql.
--
-- 1. Every actor belongs to the English group, the Arabic group, or both.
--    Each membership has its own excuse and absence counters, and its own
--    active / removed state.
-- 2. Every workshop is for English, Arabic, or both groups.
--    An actor only sees, checks in to, and is marked absent for workshops of
--    their own active groups.
-- 3. Excuses (2) and absences (2) are counted per group. Going over the
--    absence limit in one group removes the actor from that group only. The
--    account is deactivated when no active group is left. A workshop for both
--    groups counts in every group the actor is in.
-- 4. Cast members on the public team page can be marked English or Arabic.
--
-- Existing actors are put in BOTH groups and existing workshops are for BOTH,
-- so nothing changes until staff edit them. Limits (2 excuses, 2 absences):
-- keep in sync with MAX_EXCUSES and MAX_ABSENCES in src/lib/rules.ts.

-- ---------------------------------------------------------------------------
-- 1. Tables and columns
-- ---------------------------------------------------------------------------
create table public.actor_groups (
  actor_id       uuid not null references public.profiles (id) on delete cascade,
  language       text not null check (language in ('english', 'arabic')),
  active         boolean not null default true,
  excuses_used   int not null default 0 check (excuses_used >= 0),
  absences_used  int not null default 0 check (absences_used >= 0),
  primary key (actor_id, language)
);

alter table public.actor_groups enable row level security;
create policy "actor_groups read own or staff" on public.actor_groups
  for select to authenticated using (actor_id = auth.uid() or public.is_staff());
create policy "actor_groups staff manage" on public.actor_groups
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

alter table public.sessions
  add column language text not null default 'both'
    check (language in ('english', 'arabic', 'both'));

alter table public.team_members
  add column cast_language text check (cast_language in ('english', 'arabic'));

-- ---------------------------------------------------------------------------
-- 2. Counters per group
-- ---------------------------------------------------------------------------
create or replace function public.recompute_group_counters(p_actor uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.actor_groups g
     set absences_used = (
           select count(*) from public.attendance a
           join public.sessions s on s.id = a.session_id
           where a.actor_id = g.actor_id and a.status = 'absent'
             and (s.language = 'both' or s.language = g.language)),
         excuses_used = (
           select count(*) from public.attendance a
           join public.sessions s on s.id = a.session_id
           where a.actor_id = g.actor_id and a.status = 'excused'
             and (s.language = 'both' or s.language = g.language))
   where g.actor_id = p_actor;
$$;
revoke all on function public.recompute_group_counters(uuid) from public;

-- Is this workshop for one of the actor's ACTIVE groups?
create or replace function public.actor_in_session(p_actor uuid, p_session uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.actor_groups g
    join public.sessions s on s.id = p_session
    where g.actor_id = p_actor and g.active
      and (s.language = 'both' or s.language = g.language)
  );
$$;
revoke all on function public.actor_in_session(uuid, uuid) from public;
grant execute on function public.actor_in_session(uuid, uuid) to authenticated;

-- Existing actors go in both groups, keeping their current active state.
insert into public.actor_groups (actor_id, language, active)
select p.id, l.language, p.active
from public.profiles p
cross join (values ('english'), ('arabic')) as l (language)
where p.role = 'actor';

select public.recompute_group_counters(id) from public.profiles where role = 'actor';

-- A newly added group starts with counters that match the history.
create or replace function public.group_added()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.recompute_group_counters(new.actor_id);
  return new;
end;
$$;
create trigger actor_groups_added
  after insert on public.actor_groups
  for each row execute function public.group_added();

-- Replaces the trigger function from 0002.
create or replace function public.refresh_actor_counters()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := coalesce(new.actor_id, old.actor_id);
  v_lang  text;
begin
  perform public.recompute_group_counters(v_actor);

  -- Overall totals, kept on the profile for older screens.
  update public.profiles
     set absences_used = (select count(*) from public.attendance
                          where actor_id = v_actor and status = 'absent'),
         excuses_used  = (select count(*) from public.attendance
                          where actor_id = v_actor and status = 'excused')
   where id = v_actor;

  -- Going over 2 absences removes the actor from the group(s) that workshop
  -- belongs to. Only a NEW absence does it, so staff can restore a group
  -- without it flipping straight back.
  if tg_op <> 'DELETE'
     and new.status = 'absent'
     and (tg_op = 'INSERT' or old.status is distinct from 'absent') then
    select language into v_lang from public.sessions where id = new.session_id;
    update public.actor_groups g
       set active = false
     where g.actor_id = v_actor and g.active and g.absences_used > 2
       and (v_lang = 'both' or v_lang = g.language);

    -- No active group left: the account is deactivated.
    if exists (select 1 from public.actor_groups where actor_id = v_actor)
       and not exists (select 1 from public.actor_groups
                       where actor_id = v_actor and active) then
      update public.profiles set active = false where id = v_actor and role = 'actor';
    end if;
  end if;

  return null;
end;
$$;

-- Tell the actor and staff when someone is removed from, or put back in, one
-- group while the account itself stays active. (Account-level changes are
-- already announced by the trigger from 0006.)
create or replace function public.notify_group_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name  text;
  v_label text := case new.language when 'arabic' then 'Arabic' else 'English' end;
begin
  if old.active = new.active then
    return new;
  end if;

  select full_name into v_name from public.profiles where id = new.actor_id;

  if not new.active then
    -- Last active group: the account deactivation notice covers it.
    if not exists (select 1 from public.actor_groups
                   where actor_id = new.actor_id and active and language <> new.language) then
      return new;
    end if;
    insert into public.notifications (user_id, message)
    values (new.actor_id,
      'You have been removed from the ' || v_label || ' group. If you think this is a mistake, please contact the team.');
    insert into public.notifications (user_id, message)
    select p.id, v_name || ' was removed from the ' || v_label || ' group.'
    from public.profiles p where p.role = 'staff' and p.active;
  else
    -- Account reactivation notice covers this when the account was off.
    if not exists (select 1 from public.profiles where id = new.actor_id and active) then
      return new;
    end if;
    insert into public.notifications (user_id, message)
    values (new.actor_id, 'You are back in the ' || v_label || ' group.');
  end if;

  return new;
end;
$$;
create trigger actor_groups_notify
  after update of active on public.actor_groups
  for each row execute function public.notify_group_change();

-- ---------------------------------------------------------------------------
-- 3. Who can see and use which workshop
-- ---------------------------------------------------------------------------
drop policy "sessions read members" on public.sessions;
create policy "sessions read members" on public.sessions
  for select to authenticated using (
    public.is_staff()
    or (
      public.is_active_member()
      and exists (
        select 1 from public.actor_groups g
        where g.actor_id = auth.uid()
          and (sessions.language = 'both' or sessions.language = g.language)
      )
    )
  );

drop policy "forms actor send" on public.forms;
create policy "forms actor send" on public.forms
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and public.is_active_member()
    and status = 'pending'
    and counted_as is null
    and public.actor_in_session(auth.uid(), session_id)
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and s.starts_at > now() and not s.cancelled
    )
  );

-- ---------------------------------------------------------------------------
-- 4. QR check-in: only for the actor's own groups
-- ---------------------------------------------------------------------------
create or replace function public.check_in(p_token text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_profile  public.profiles%rowtype;
  v_session  public.sessions%rowtype;
  v_existing text;
  v_status   text;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.role <> 'actor' or not v_profile.active then
    raise exception 'Only active actors can check in.' using errcode = '42501';
  end if;

  select s.* into v_session
  from public.sessions s
  join public.session_tokens t on t.session_id = s.id
  where t.qr_token = p_token;

  if not found or v_session.cancelled then
    raise exception 'This QR code is not valid.';
  end if;

  if not public.actor_in_session(v_profile.id, v_session.id) then
    raise exception 'This workshop is not for your group.';
  end if;

  select status into v_existing
  from public.attendance
  where session_id = v_session.id and actor_id = v_profile.id;

  if v_existing is not null then
    return jsonb_build_object('status', v_existing, 'title', v_session.title, 'already', true);
  end if;

  -- The code is shown in the room, so it only works from 1 hour before the start.
  if now() < v_session.starts_at - interval '1 hour' then
    raise exception 'Check-in has not opened yet.';
  end if;
  if now() > v_session.closes_at then
    raise exception 'Check-in is closed for this session.';
  end if;

  v_status := case when now() <= v_session.late_after then 'present' else 'late' end;

  insert into public.attendance (session_id, actor_id, status, scanned_at)
  values (v_session.id, v_profile.id, v_status, now());

  return jsonb_build_object('status', v_status, 'title', v_session.title, 'already', false);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Closing a session: only actors of its groups can be marked absent
-- ---------------------------------------------------------------------------
create or replace function public.close_session(p_session uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_session public.sessions%rowtype;
  v_marked  int;
begin
  if not public.is_staff() then
    raise exception 'Only staff can close a session.' using errcode = '42501';
  end if;

  select * into v_session from public.sessions where id = p_session for update;
  if not found then
    raise exception 'Session not found.';
  end if;
  if v_session.cancelled then
    raise exception 'This session was cancelled.';
  end if;
  if v_session.closed_at is not null then
    raise exception 'This session is already closed.';
  end if;
  if now() < v_session.closes_at then
    raise exception 'You can close the session after the QR code closes.';
  end if;

  insert into public.attendance (session_id, actor_id, status)
  select p_session, p.id, 'absent'
  from public.profiles p
  where p.role = 'actor' and p.active
    and public.actor_in_session(p.id, p_session)
    and not exists (
      select 1 from public.attendance a
      where a.session_id = p_session and a.actor_id = p.id
    );
  get diagnostics v_marked = row_count;

  update public.sessions set closed_at = now() where id = p_session;
  return v_marked;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Reviewing a form: the excuse limit is counted in the workshop's groups
-- ---------------------------------------------------------------------------
create or replace function public.review_form(
  p_form   uuid,
  p_accept boolean,
  p_urgent boolean default false
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_staff    public.profiles%rowtype;
  v_form     public.forms%rowtype;
  v_actor    public.profiles%rowtype;
  v_session  public.sessions%rowtype;
  v_excuses  int;
  v_counted  text;
  v_status   text;
  v_message  text;
begin
  select * into v_staff from public.profiles
  where id = auth.uid() and role = 'staff' and active;
  if not found then
    raise exception 'Only staff can review forms.' using errcode = '42501';
  end if;

  select * into v_form from public.forms where id = p_form for update;
  if not found then
    raise exception 'Form not found.';
  end if;
  if v_form.status <> 'pending' then
    raise exception 'This form was already reviewed.';
  end if;

  select * into v_actor from public.profiles where id = v_form.actor_id for update;
  select * into v_session from public.sessions where id = v_form.session_id;

  -- Highest excuse count among the actor's groups that this workshop is for.
  select coalesce(max(g.excuses_used), 0) into v_excuses
  from public.actor_groups g
  where g.actor_id = v_form.actor_id
    and (v_session.language = 'both' or v_session.language = g.language);

  if p_accept then
    v_status := 'accepted';
    if v_form.type = 'absence' then
      v_counted := case
        when v_excuses < 2 or coalesce(p_urgent, false) then 'excuse'
        else 'absence'
      end;
      insert into public.attendance (session_id, actor_id, status, edited_by)
      values (v_form.session_id, v_form.actor_id,
              case v_counted when 'excuse' then 'excused' else 'absent' end,
              v_staff.id)
      on conflict (session_id, actor_id)
      do update set status = excluded.status, edited_by = excluded.edited_by;
      v_message := 'Your absence form for ' || v_session.title || ' was accepted' ||
        case v_counted
          when 'excuse' then ' and counted as an excuse.'
          else ', but you had already used your 2 excuses, so it counts as an absence.'
        end;
    else
      v_message := 'Your late form for ' || v_session.title || ' was accepted.';
    end if;
  else
    v_status := 'rejected';
    if v_form.type = 'absence' then
      v_counted := 'absence';
      v_message := 'Your absence form for ' || v_session.title ||
        ' was rejected. It counts as an absence unless you attend.';
    else
      v_message := 'Your late form for ' || v_session.title || ' was rejected.';
    end if;
  end if;

  update public.forms
     set status = v_status, counted_as = v_counted,
         reviewed_by = v_staff.id, reviewed_at = now()
   where id = p_form;

  insert into public.notifications (user_id, message)
  values (v_form.actor_id, v_message);

  return jsonb_build_object('status', v_status, 'counted_as', v_counted);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Attendance totals per actor and group for the staff Actors page
-- ---------------------------------------------------------------------------
create or replace function public.actor_group_stats()
returns table (
  actor_id uuid,
  language text,
  present  int,
  late     int,
  excused  int,
  absent   int
)
language sql stable security definer set search_path = public
as $$
  select g.actor_id, g.language,
         count(a.id) filter (where a.status = 'present')::int,
         count(a.id) filter (where a.status = 'late')::int,
         count(a.id) filter (where a.status = 'excused')::int,
         count(a.id) filter (where a.status = 'absent')::int
  from public.actor_groups g
  join public.sessions s on s.language = 'both' or s.language = g.language
  left join public.attendance a on a.session_id = s.id and a.actor_id = g.actor_id
  where public.is_staff()
  group by g.actor_id, g.language;
$$;
revoke all on function public.actor_group_stats() from public;
grant execute on function public.actor_group_stats() to authenticated;
