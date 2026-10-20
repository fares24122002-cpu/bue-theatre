-- BUE Theatre Team website: President and Vice President on the team page.
-- Run this in the Supabase SQL editor AFTER 0006_account_notifications.sql.
-- Team order on the public page: Director, Assistant director, President,
-- Vice president, Backstage, Media team, Cast.

alter table public.team_members drop constraint team_members_team_group_check;
alter table public.team_members add constraint team_members_team_group_check
  check (team_group in (
    'director', 'assistant_director', 'president', 'vice_president',
    'backstage', 'media', 'cast'
  ));
