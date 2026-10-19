-- BUE Theatre Team website: ticket reservations and door check-in.
-- Run this in the Supabase SQL editor AFTER 0004_actor_stats.sql.
--
-- book_tickets(): used by the server (service role) when a visitor reserves.
--   Locks the show so two people cannot take the last seats at once, then checks:
--   the show is published and has not started, the booking is within the
--   per-booking limit, the same email has not booked more than that limit in
--   total for this show, and enough seats are left.
--   Visitors cannot call it directly; only the server can.
-- door_check_in(): used by staff at the door. Marks a ticket as used.

create or replace function public.book_tickets(
  p_show    uuid,
  p_name    text,
  p_email   text,
  p_phone   text,
  p_tickets int
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_show   public.shows%rowtype;
  v_booked int;
  v_mine   int;
  v_code   text;
begin
  select * into v_show from public.shows where id = p_show for update;
  if not found or not v_show.published then
    raise exception 'This show is not available.';
  end if;
  if v_show.starts_at <= now() then
    raise exception 'This show has already started.';
  end if;
  if p_tickets is null or p_tickets < 1 then
    raise exception 'Choose how many tickets you need.';
  end if;
  if p_tickets > v_show.max_tickets_per_booking then
    raise exception 'You can book at most % tickets.', v_show.max_tickets_per_booking;
  end if;

  select coalesce(sum(tickets), 0) into v_mine
  from public.reservations
  where show_id = p_show and lower(email) = lower(p_email);
  if v_mine + p_tickets > v_show.max_tickets_per_booking then
    raise exception 'This email has already booked % ticket(s). The limit is % per person for this show.',
      v_mine, v_show.max_tickets_per_booking;
  end if;

  select coalesce(sum(tickets), 0) into v_booked
  from public.reservations where show_id = p_show;
  if v_booked + p_tickets > v_show.capacity then
    if v_show.capacity - v_booked <= 0 then
      raise exception 'Sorry, this show is sold out.';
    end if;
    raise exception 'Only % seat(s) left.', v_show.capacity - v_booked;
  end if;

  insert into public.reservations (show_id, name, email, phone, tickets)
  values (p_show, trim(p_name), lower(trim(p_email)), nullif(trim(coalesce(p_phone, '')), ''), p_tickets)
  returning ticket_code into v_code;

  return v_code;
end;
$$;

revoke all on function public.book_tickets(uuid, text, text, text, int) from public, anon, authenticated;
grant execute on function public.book_tickets(uuid, text, text, text, int) to service_role;

create or replace function public.door_check_in(p_code text, p_show uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Only staff can check tickets in.' using errcode = '42501';
  end if;

  select * into v_res from public.reservations
  where ticket_code = p_code for update;
  if not found then
    raise exception 'Ticket not found.';
  end if;
  if v_res.show_id <> p_show then
    raise exception 'This ticket is for a different show.';
  end if;

  if v_res.checked_in then
    return jsonb_build_object('name', v_res.name, 'tickets', v_res.tickets, 'already', true);
  end if;

  update public.reservations set checked_in = true where id = v_res.id;
  return jsonb_build_object('name', v_res.name, 'tickets', v_res.tickets, 'already', false);
end;
$$;

revoke all on function public.door_check_in(text, uuid) from public, anon;
grant execute on function public.door_check_in(text, uuid) to authenticated;

-- Tidy-up: Supabase gives the anonymous role access to new functions by
-- default. The staff and actor functions from the earlier migrations already
-- refuse visitors inside, but visitors should not be able to call them at all.
revoke execute on function public.check_in(text) from anon;
revoke execute on function public.close_session(uuid) from anon;
revoke execute on function public.review_form(uuid, boolean, boolean) from anon;
revoke execute on function public.actor_stats() from anon;
