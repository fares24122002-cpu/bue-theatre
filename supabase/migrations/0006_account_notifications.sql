-- BUE Theatre Team website: notifications for account changes, and email prep.
-- Run this in the Supabase SQL editor AFTER 0005_reservations.sql.
--
-- 1. When an actor's account is deactivated (3rd absence, or by staff) or
--    reactivated, the actor gets a notification, and staff get one about the
--    deactivation. A deactivated actor cannot log in to read it, so the website
--    also sends every notification by email (see src/lib/email.ts).
-- 2. Notifications created before emails existed are marked as already sent,
--    so turning emails on later does not send old test messages.

create or replace function public.notify_account_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role <> 'actor' or old.active = new.active then
    return new;
  end if;

  if not new.active then
    insert into public.notifications (user_id, message)
    values (new.id,
      'Your BUE Theatre account has been deactivated. If you think this is a mistake, please contact the team to have it reactivated.');
    insert into public.notifications (user_id, message)
    select p.id, new.full_name || '''s account was deactivated.'
    from public.profiles p
    where p.role = 'staff' and p.active;
  else
    insert into public.notifications (user_id, message)
    values (new.id, 'Your BUE Theatre account has been reactivated. You can log in again.');
  end if;

  return new;
end;
$$;

create trigger profiles_notify_account_change
  after update of active on public.profiles
  for each row execute function public.notify_account_change();

update public.notifications set emailed = true;
