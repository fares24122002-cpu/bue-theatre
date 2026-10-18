-- Run this ONCE, after 0001_init.sql, to make the first staff account.
--
-- 1. In Supabase: Authentication > Users > Add user > Create new user.
--    Enter the director's email and a password, and tick "Auto Confirm User".
-- 2. Replace the email and name below, then run this in the SQL editor.

insert into public.profiles (id, full_name, email, role)
select id, 'REPLACE WITH THE DIRECTOR''S NAME', email, 'staff'
from auth.users
where email = 'REPLACE-WITH-THE-SAME-EMAIL@example.com';
