-- BUE Theatre Team website: attendance logic.
-- Run this in the Supabase SQL editor AFTER 0001_init.sql.
--
-- 1. Moves each session's QR token into a staff-only table. In 0001 the token
--    sat in the sessions table, which every actor can read, so an actor could
--    have checked in without being in the room.
-- 2. check_in(): an actor scans the QR code. Present, late or refused.
-- 3. close_session(): staff close a finished session. Everyone without a
--    scan or an accepted form is marked absent.
-- 4. A trigger keeps each actor's excuse and absence counters in step with
--    their attendance rows, and deactivates an actor on their 3rd absence.
--    Limit of 2 absences: keep in sync with MAX_ABSENCES in src/lib/rules.ts.

-- ---------------------------------------------------------------------------
-- 1. Staff-only QR tokens
-- ---------------------------------------------------------------------------
create table public.session_tokens (
  session_id  uuid primary key references public.sessions (id) on delete cascade,
  qr_token    text not null unique default encode(gen_random_bytes(16), 'hex')
);

insert into public.session_tokens (session_id, qr_token)
select id, qr_token from public.sessions;

alter table public.sessions drop column qr_token;
alter table public.sessions add column closed_at timestamptz;

alter table public.session_tokens enable row level security;
create policy "session_tokens staff only" on public.session_tokens
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Every new session gets its own token automatically.
create or replace function public.create_session_token()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.session_tokens (session_id) values (new.id);
  return new;
end;
$$;

create trigger sessions_create_token
  after insert on public.sessions
  for each row execute function public.create_session_token();

-- ---------------------------------------------------------------------------
-- 2. QR check-in
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

revoke all on function public.check_in(text) from public;
grant execute on function public.check_in(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Closing a session
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
    and not exists (
      select 1 from public.attendance a
      where a.session_id = p_session and a.actor_id = p.id
    );
  get diagnostics v_marked = row_count;

  update public.sessions set closed_at = now() where id = p_session;
  return v_marked;
end;
$$;

revoke all on function public.close_session(uuid) from public;
grant execute on function public.close_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Counters follow the attendance rows
-- ---------------------------------------------------------------------------
create or replace function public.refresh_actor_counters()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_actor    uuid := coalesce(new.actor_id, old.actor_id);
  v_absences int;
  v_excuses  int;
begin
  select count(*) filter (where status = 'absent'),
         count(*) filter (where status = 'excused')
    into v_absences, v_excuses
  from public.attendance
  where actor_id = v_actor;

  update public.profiles
     set absences_used = v_absences, excuses_used = v_excuses
   where id = v_actor;

  -- Going over 2 absences deactivates the account. Only a NEW absence does it,
  -- so staff can reactivate an actor without it flipping straight back.
  if tg_op <> 'DELETE'
     and new.status = 'absent'
     and (tg_op = 'INSERT' or old.status is distinct from 'absent')
     and v_absences > 2 then
    update public.profiles set active = false where id = v_actor and role = 'actor';
  end if;

  return null;
end;
$$;

create trigger attendance_counters
  after insert or update of status or delete on public.attendance
  for each row execute function public.refresh_actor_counters();
