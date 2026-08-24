-- Basic role-based RLS: `authenticated` (logged-in admins) gets full
-- SELECT/INSERT/UPDATE/DELETE on every table; `anon` (the public) gets
-- narrow, explicit carve-outs for exactly what the public pages actually
-- do — nothing more.
--
-- *** DO NOT RUN THIS AUTOMATICALLY. ***
-- Per instructions, this file is deliberately NOT applied by `supabase db
-- push` in this session — run it yourself (dashboard SQL editor, or
-- `supabase db push` from your own machine) once you've confirmed:
--   1. You've created at least one admin user in the Supabase dashboard
--      (Authentication → Users → Add user) and verified you can log in at
--      /login and reach /admin with it.
--   2. You're comfortable with the public/anon carve-outs below matching
--      what this app's public routes actually need (see the comment above
--      each block) — get one wrong and either a public page breaks, or
--      something that should be admin-only becomes publicly writable.
--
-- Public carve-outs are wider than "the RSVP flow" alone, because three
-- already-shipped public routes need real read (or, for /cadastro, insert)
-- access:
--   - /lista/[sessionId]  (RSVP)            → sessions, players (read),
--                                              session_presences (read+insert)
--   - /financeiro-publico (transparency)    → payments, expenses (read)
--   - /cadastro (player self-registration)  → players (insert only — new
--                                              signups land as status
--                                              'pending', never touch any
--                                              other table)
-- `matches` and `match_participations` are never read/written by any
-- public route, so they get no anon policy at all — authenticated-only,
-- full stop.

alter table players enable row level security;
alter table sessions enable row level security;
alter table session_presences enable row level security;
alter table matches enable row level security;
alter table match_participations enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;

-- --- Authenticated admins: full access to everything ----------------------

create policy "authenticated_full_access_players"
  on players for all to authenticated using (true) with check (true);

create policy "authenticated_full_access_sessions"
  on sessions for all to authenticated using (true) with check (true);

create policy "authenticated_full_access_session_presences"
  on session_presences for all to authenticated using (true) with check (true);

create policy "authenticated_full_access_matches"
  on matches for all to authenticated using (true) with check (true);

create policy "authenticated_full_access_match_participations"
  on match_participations for all to authenticated using (true) with check (true);

create policy "authenticated_full_access_payments"
  on payments for all to authenticated using (true) with check (true);

create policy "authenticated_full_access_expenses"
  on expenses for all to authenticated using (true) with check (true);

-- --- Public carve-outs ------------------------------------------------------

-- /lista/[sessionId] lists every player and needs the session's date/status.
create policy "public_read_players"
  on players for select to anon using (true);

-- /cadastro (registerPlayer, app/actions/players.ts) — new signups only,
-- always landing as status = 'pending'. No anon update/delete on players.
create policy "public_insert_players"
  on players for insert to anon with check (true);

create policy "public_read_sessions"
  on sessions for select to anon using (true);

-- /lista/[sessionId] reads existing confirmations/waitlist, and
-- confirmPresence (app/actions/rsvp.ts) inserts a new one — it never
-- updates or deletes, so those stay authenticated-only via the policy above.
create policy "public_read_session_presences"
  on session_presences for select to anon using (true);

create policy "public_insert_session_presences"
  on session_presences for insert to anon with check (true);

-- /financeiro-publico reads paid payments and all expenses. Nothing public
-- ever writes to either table.
create policy "public_read_payments"
  on payments for select to anon using (true);

create policy "public_read_expenses"
  on expenses for select to anon using (true);

-- --- Storage (run only after creating each bucket) -------------------------
--
-- Both buckets are created by hand in the dashboard, not by a migration
-- (see utils/storage.ts). Once they exist, run this separately — public
-- buckets already allow anonymous *reads* without a policy, but *uploads*
-- still need one, and the two buckets need opposite roles:
--
-- create policy "authenticated_upload_comprovantes"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'comprovantes');
--
-- -- Uploaded from the public, unauthenticated /cadastro form — anon, not
-- -- authenticated, unlike comprovantes above.
-- create policy "public_upload_avatars"
--   on storage.objects for insert to anon
--   with check (bucket_id = 'avatars');
