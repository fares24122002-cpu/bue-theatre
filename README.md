# BUE Theatre Team website

One website with two jobs: it runs the team's rehearsals and attendance behind a login, and it shows the team and its shows to the public.

- **Staff** (director and backstage share one role): workshops, session QR codes, attendance, absence and late forms, actor accounts, public content.
- **Actors**: upcoming workshops, own attendance rate, QR check-in, absence and late forms.
- **Public**: history, team, shows, free ticket reservations with a QR ticket, gallery.

Requirements and designs were approved first; this repository is the build.

## Stack

Next.js 16 (App Router, TypeScript) · Supabase (database, login, file storage) · Vercel (hosting) · `qrcode` for QR images.

Note: this Next.js version renames `middleware` to `proxy` and has other changes. Docs for the installed version are in `node_modules/next/dist/docs/`.

## Status

| Phase | State |
| --- | --- |
| 1-3 Requirements, requirements document, designs | Done |
| 4 Project setup (this commit): structure, empty pages, database schema | Done |
| 5.1 Login, logout, staff and actor protection | Done |
| 5.2 Workshops, QR attendance, actor dashboard | Done (run migration 0002) |
| 5.3 Absence and late forms, staff review, in-site notifications | Done (run migration 0003) |
| 5.3b Notification emails | Later (needs an email service account) |
| 5.4a Staff Actors page: create accounts, reactivate, new password | Done (run migration 0004) |
| 5.4b Public site (history, team, shows, show page, gallery) and the staff content editor | Done |
| 5.4c Reservations, QR tickets, bookings list, door check-in | Done (run migration 0005) |
| 5.5 Emails: ticket, new form, decision, account changes | Done (run migration 0006, then add the SMTP settings in Vercel) |
| 5.4 Public site: history, team, shows, reservations, gallery | Planned |

Screens not built yet show a "not built yet" placeholder naming the design to build from.

## How login and roles work

- `src/proxy.ts` refreshes the login session and sends logged-out visitors from `/actor` and `/staff` to `/login`, then back to the page they wanted.
- `src/lib/auth.ts` has `requireRole('staff' | 'actor')`. Every protected page, Server Action and Route Handler must call it near its data. The staff and actor layouts already wrap their pages in it.
- Deactivated accounts cannot log in. If an account is deactivated while logged in, its next page load is blocked and sent to `/login` with a message.
- Staff and actors who open the wrong area are sent to their own home.

## Routes

| Area | Routes |
| --- | --- |
| Public | `/`, `/history`, `/team`, `/shows`, `/shows/[id]`, `/shows/[id]/reserve`, `/ticket/[code]`, `/gallery`, `/gallery/[id]` |
| Login | `/login` |
| Actor | `/actor`, `/actor/forms/new`, `/actor/notifications`, `/actor/scan` (also opened by scanning the session QR with the phone camera: `/actor/scan?t=...`) |
| Staff | `/staff/workshops`, `/staff/workshops/new`, `/staff/sessions/[id]`, `/staff/sessions/[id]/edit`, `/staff/sessions/[id]/qr`, `/staff/forms`, `/staff/notifications`, `/staff/actors`, `/staff/content`, `/staff/content/team`, `/staff/content/shows` (+ `/new`, `/[id]`, `/[id]/bookings`, `/[id]/door`), `/staff/content/gallery` (+ `/[id]`) |

## Set up Supabase (once)

1. In Supabase, create a new project. Pick a region close to Egypt, and save the database password.
2. Open **SQL Editor > New query**, paste all of `supabase/migrations/0001_init.sql`, and run it. Then do the same for `0002_attendance.sql` (QR check-in, closing sessions, absence counting) `0003_forms.sql` (forms review and notifications) and `0004_actor_stats.sql` (totals for the Actors page) `0005_reservations.sql` (ticket booking and door check-in) and `0006_account_notifications.sql` (notifications when an account is deactivated or reactivated). Run the files in order, once each.
3. Open **Authentication > Users > Add user > Create new user**. Enter the director's email and a password, and tick **Auto Confirm User**.
4. Open `supabase/first-staff-account.sql`, replace the name and email, and run it. This makes that user the first staff account.
5. Open **Project Settings > API** and copy the Project URL, the publishable (anon) key and the secret (service role) key.

## Run it on your computer

```bash
cp .env.example .env.local   # then paste the three Supabase values
npm install
npm run dev                  # http://localhost:3000
```

## Deploy on Vercel

1. Push this project to a GitHub repository.
2. In Vercel: **Add New > Project**, import the repository, keep the default Next.js settings.
3. Under **Environment Variables**, add the same variables as `.env.local`. Set `NEXT_PUBLIC_SITE_URL` to the Vercel address.
4. Deploy. Every later push to `main` deploys automatically.

The service role key must only be added as a variable in Vercel. It must never be committed or shown in the browser.

## Business rules (kept in `src/lib/rules.ts`)

- Each actor has 2 excuses. A further accepted excuse counts as an absence, unless staff mark a third excuse as urgent.
- Going over 2 absences (the 3rd) deactivates the account. Only staff can reactivate it.
- A rejected form counts as an absence.
- Late arrivals are recorded as late, with no limit and no penalty.
- Attendance rate = (present + late) / all sessions. Excused and absent both lower it.
- Forms can only be sent before the session starts.
- Staff set three times per session: start, late-after and QR closes.

## How attendance works

- All times are entered and shown in Cairo time (`src/lib/time.ts`).
- Each session has a QR code (a link to `/actor/scan?t=...`). The code is kept in a staff-only table, so actors cannot read it from the database.
- `check_in()` in the database decides: before "late after" is present, until "QR closes" is late, after that refused. It only works from one hour before the start, and only for active actors. A second scan changes nothing.
- Staff close a session after the QR closes. Everyone without a mark is then marked absent.
- A trigger keeps each actor's excuse and absence counts in step with their attendance, and deactivates the account on the 3rd absence. Staff can correct any mark on the session page.

## How forms work

- An actor sends one form per workshop, before it starts: absence (reason) or late (reason and expected arrival). A late arrival after the QR closes must be an absence form instead.
- Every staff member is notified of a new form. Staff accept or reject on `/staff/forms`, and the actor is notified of the decision.
- Accepted absence: an excuse for the first 2, then an absence, unless staff tick "urgent". The actor's attendance for that workshop is set to excused or absent straight away.
- Rejected absence: counts as an absence. If the actor does not scan in, closing the session marks them absent. If they attend and scan, they are present.
- Late forms only inform staff. Late is recorded by the scan, with no limit and no penalty.
- The rules live in the database function `review_form()` (migration 0003) and in `src/lib/rules.ts`.

## How public content works

- Visitors read through a cookie-less client (`src/lib/supabase/public.ts`), so they only ever see what the database rules allow: published shows and public content.
- Staff edit everything under `/staff/content`: story, tagline and footer text, milestones, the team (five groups), shows with cast and crew, and gallery albums.
- A show is hidden until "Published" is ticked. Only published shows are visible and can be reserved.
- Pictures are shrunk in the browser (long side 1800px) and uploaded to the public `media` bucket. Removing a picture from the site does not delete the file from storage.
- Times are Cairo time, as for workshops.

## How reservations work

- A visitor opens a published show, chooses 1 up to the show's per-booking limit, and gives name, email (required) and phone (optional). No account.
- The server calls the database function `book_tickets()` with the service role. It locks the show, then checks: published, not started, within the limit, the same email has not booked more than the limit in total for this show, and enough seats are left. Visitors cannot call it themselves.
- The visitor lands on `/ticket/[code]`: the QR ticket, downloadable as a PNG. The link is the ticket (the code is a long random secret). Emailing the ticket comes with 5.5.
- Staff see bookings per show, can mark arrival or cancel a booking, and check tickets in at the door by scanning the QR (or typing the code). A ticket for another show is refused, a second scan says "already checked in".

## How emails work

- Every in-site notification is also emailed (new form to staff, form decision, account deactivated or reactivated), and every reservation emails the ticket with its QR code. Staff can resend a ticket from the Bookings page.
- Settings (Vercel > Settings > Environment Variables, then redeploy): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. A free Gmail account works: turn on 2-step verification, create an App password, use `smtp.gmail.com`, port `465`. Resend (`RESEND_API_KEY`, `EMAIL_FROM`) is supported too but only emails strangers from a verified domain.
- Without these settings the site works exactly the same and simply sends no email.
- Code: `src/lib/email.ts` (sending, templates), `src/lib/notify.ts` (sends after the response so pages stay fast). Each notification is claimed before sending so nobody gets two copies.
