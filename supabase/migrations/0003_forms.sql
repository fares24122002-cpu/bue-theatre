-- BUE Theatre Team website: absence and late forms.
-- Run this in the Supabase SQL editor AFTER 0002_attendance.sql.
--
-- 1. When an actor sends a form, every staff member gets a notification.
-- 2. review_form(): staff accept or reject a form.
--    - Accepted absence form: counts as an excuse while the actor has used
--      fewer than 2 excuses. After that it counts as an absence, unless staff
--      tick "urgent", which keeps it an excuse (the 3rd excuse rule).
--      The actor's attendance for that session is set to excused or absent.
--    - Rejected form: counts as an absence. Nothing is written yet; if the
--      actor does not scan in, closing the session marks them absent. If they
--      come and scan anyway, they are present.
--    - Late forms only inform staff. Arriving late is recorded as late by the
--      scan, with no limit and no penalty.
--    - The actor is notified of the decision.
-- Keep the limit of 2 excuses in sync with MAX_EXCUSES in src/lib/rules.ts.

-- ---------------------------------------------------------------------------
-- 1. Tell staff about new forms
-- ---------------------------------------------------------------------------
create or replace function public.notify_staff_of_form()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_actor   text;
  v_session text;
begin
  select full_name into v_actor from public.profiles where id = new.actor_id;
  select title into v_session from public.sessions where id = new.session_id;

  insert into public.notifications (user_id, message)
  select p.id,
         v_actor || ' sent ' ||
         case new.type when 'absence' then 'an absence' else 'a late' end ||
         ' form for ' || v_session || '.'
  from public.profiles p
  where p.role = 'staff' and p.active;

  return new;
end;
$$;

create trigger forms_notify_staff
  after insert on public.forms
  for each row execute function public.notify_staff_of_form();

-- ---------------------------------------------------------------------------
-- 2. Reviewing a form
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
  v_counted  text;
  v_status   text;
  v_message  text;
  v_kind     text;
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

  v_kind := case v_form.type when 'absence' then 'absence' else 'late' end;

  if p_accept then
    v_status := 'accepted';
    if v_form.type = 'absence' then
      v_counted := case
        when v_actor.excuses_used < 2 or coalesce(p_urgent, false) then 'excuse'
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

revoke all on function public.review_form(uuid, boolean, boolean) from public;
grant execute on function public.review_form(uuid, boolean, boolean) to authenticated;
