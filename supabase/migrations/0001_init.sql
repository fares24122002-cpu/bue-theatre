-- BUE Theatre Team website: initial database schema.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- It creates the tables and the access rules (row level security).
-- The business functions (QR check-in, form review, closing a session)
-- are added in the build phase.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- People: one profile per login (staff or actor)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null,
  email          text not null unique,
  role           text not null check (role in ('staff', 'actor')),
  active         boolean not null default true,
  excuses_used   int not null default 0 check (excuses_used >= 0),
  absences_used  int not null default 0 check (absences_used >= 0),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rehearsals and workshops
-- ---------------------------------------------------------------------------
create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  location    text,
  notes       text,
  starts_at   timestamptz not null,
  late_after  timestamptz not null,   -- scans after this time count as late
  closes_at   timestamptz not null,   -- scans after this time are refused
  qr_token    text not null unique default encode(gen_random_bytes(16), 'hex'),
  cancelled   boolean not null default false,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  check (starts_at <= late_after and late_after <= closes_at)
);
create index sessions_starts_at_idx on public.sessions (starts_at);

create table public.attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  actor_id    uuid not null references public.profiles (id) on delete cascade,
  status      text not null check (status in ('present', 'late', 'excused', 'absent')),
  scanned_at  timestamptz,
  edited_by   uuid references public.profiles (id),
  unique (session_id, actor_id)
);
create index attendance_session_idx on public.attendance (session_id);

-- ---------------------------------------------------------------------------
-- Absence and late forms
-- ---------------------------------------------------------------------------
create table public.forms (
  id               uuid primary key default gen_random_uuid(),
  actor_id         uuid not null references public.profiles (id) on delete cascade,
  session_id       uuid not null references public.sessions (id) on delete cascade,
  type             text not null check (type in ('absence', 'late')),
  reason           text not null,
  expected_arrival time,                -- late forms only
  status           text not null default 'pending'
                     check (status in ('pending', 'accepted', 'rejected')),
  counted_as       text check (counted_as in ('excuse', 'absence')),
  reviewed_by      uuid references public.profiles (id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (actor_id, session_id)
);
create index forms_session_idx on public.forms (session_id);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  message     text not null,
  read        boolean not null default false,
  emailed     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Public site: shows, reservations, team, gallery, history
-- ---------------------------------------------------------------------------
create table public.shows (
  id                      uuid primary key default gen_random_uuid(),
  title                   text not null,
  description             text,
  poster_url              text,
  starts_at               timestamptz not null,
  venue                   text,
  map_url                 text,
  trailer_url             text,
  capacity                int not null check (capacity >= 0),
  max_tickets_per_booking int not null default 4 check (max_tickets_per_booking > 0),
  published               boolean not null default false,
  created_at              timestamptz not null default now()
);
create index shows_starts_at_idx on public.shows (starts_at);

create table public.show_people (
  id           uuid primary key default gen_random_uuid(),
  show_id      uuid not null references public.shows (id) on delete cascade,
  person_name  text not null,
  group_name   text not null check (group_name in ('cast', 'crew')),
  role         text,
  photo_url    text,
  sort_order   int not null default 0
);

create table public.reservations (
  id           uuid primary key default gen_random_uuid(),
  show_id      uuid not null references public.shows (id) on delete cascade,
  name         text not null,
  email        text not null,
  phone        text,
  tickets      int not null check (tickets > 0),
  ticket_code  text not null unique default encode(gen_random_bytes(8), 'hex'),
  checked_in   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index reservations_show_idx on public.reservations (show_id);

create table public.team_members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  photo_url   text,
  team_group  text not null
                check (team_group in ('director', 'assistant_director', 'backstage', 'media', 'cast')),
  role        text,
  bio         text,
  sort_order  int not null default 0
);

create table public.albums (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  show_id     uuid references public.shows (id) on delete set null,
  cover_url   text,
  created_at  timestamptz not null default now()
);

create table public.photos (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references public.albums (id) on delete cascade,
  url         text not null,
  sort_order  int not null default 0
);

create table public.history_milestones (
  id          uuid primary key default gen_random_uuid(),
  year        text not null,
  title       text not null,
  summary     text,
  sort_order  int not null default 0
);

-- Free-form site text: 'story' (history text), 'tagline', 'contact_email', ...
create table public.site_settings (
  key    text primary key,
  value  text not null
);

-- ---------------------------------------------------------------------------
-- Helper functions used by the access rules
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'staff' and p.active
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
  );
$$;

-- Seats left for a published show, without exposing anyone's reservation.
create or replace function public.seats_left(p_show uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select s.capacity - coalesce(
           (select sum(r.tickets)::int from public.reservations r where r.show_id = s.id), 0)
  from public.shows s
  where s.id = p_show and s.published;
$$;
grant execute on function public.seats_left(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Access rules (row level security)
-- Staff can do everything. Actors see only their own data.
-- The public can read the public site content, nothing else.
-- ---------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.sessions           enable row level security;
alter table public.attendance         enable row level security;
alter table public.forms              enable row level security;
alter table public.notifications      enable row level security;
alter table public.shows              enable row level security;
alter table public.show_people        enable row level security;
alter table public.reservations       enable row level security;
alter table public.team_members       enable row level security;
alter table public.albums             enable row level security;
alter table public.photos             enable row level security;
alter table public.history_milestones enable row level security;
alter table public.site_settings      enable row level security;

-- profiles: you see yourself, staff see and manage everyone.
-- Actors cannot edit their own row, so they cannot reset their counters.
create policy "profiles read own or staff" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "profiles staff manage" on public.profiles
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- sessions: active members read, staff manage.
create policy "sessions read members" on public.sessions
  for select to authenticated using (public.is_active_member());
create policy "sessions staff manage" on public.sessions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- attendance: actors read their own, staff manage.
-- Actors check in through a function added in the build phase, not by writing here.
create policy "attendance read own or staff" on public.attendance
  for select to authenticated using (actor_id = auth.uid() or public.is_staff());
create policy "attendance staff manage" on public.attendance
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- forms: actors read their own and send new ones before the session starts.
-- Staff review them (update) and manage everything.
create policy "forms read own or staff" on public.forms
  for select to authenticated using (actor_id = auth.uid() or public.is_staff());
create policy "forms actor send" on public.forms
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and public.is_active_member()
    and status = 'pending'
    and counted_as is null
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and s.starts_at > now() and not s.cancelled
    )
  );
create policy "forms staff manage" on public.forms
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- notifications: each person reads and marks their own, staff can create.
create policy "notifications read own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications mark own read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications staff manage" on public.notifications
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- shows: the public sees published shows, staff see and manage all.
create policy "shows read published" on public.shows
  for select to anon, authenticated using (published or public.is_staff());
create policy "shows staff manage" on public.shows
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "show_people read published" on public.show_people
  for select to anon, authenticated using (
    public.is_staff()
    or exists (select 1 from public.shows s where s.id = show_id and s.published)
  );
create policy "show_people staff manage" on public.show_people
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- reservations: staff only. Visitors book through the server (service role),
-- which checks capacity and the per-booking ticket limit.
create policy "reservations staff manage" on public.reservations
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Public content: everyone reads, staff manage.
create policy "team_members read" on public.team_members
  for select to anon, authenticated using (true);
create policy "team_members staff manage" on public.team_members
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "albums read" on public.albums
  for select to anon, authenticated using (true);
create policy "albums staff manage" on public.albums
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "photos read" on public.photos
  for select to anon, authenticated using (true);
create policy "photos staff manage" on public.photos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "history_milestones read" on public.history_milestones
  for select to anon, authenticated using (true);
create policy "history_milestones staff manage" on public.history_milestones
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "site_settings read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings staff manage" on public.site_settings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- File storage for posters, team photos and gallery images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media staff manage" on storage.objects
  for all to authenticated
  using (bucket_id = 'media' and public.is_staff())
  with check (bucket_id = 'media' and public.is_staff());
