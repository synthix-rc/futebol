-- Gamificação Pós-Jogo: "Urna da Rodada" (Craque / Insuportável / Pereba),
-- open for exactly 2 hours after a session closes.
--
-- `sessions.closed_at` is the anchor for that 2-hour window (see
-- closeSession, app/actions/sessions.ts) — nullable because every session
-- that isn't `closed` yet (or was closed before this column existed) has
-- no value here.
--
-- `session_votes` is one row per voter per session (the UNIQUE constraint
-- below is what actually enforces "voto único" — the Server Action checks
-- it too, but a race between two requests is the DB's job to catch, not
-- app code's). All three picks are nullable individually since a vote
-- could in principle be partial, but `voter_player_id`/`session_id` are
-- always required — a row only exists because someone voted.
--
-- RLS intentionally NOT enabled here, same as every other table in this
-- schema right now — see the note in 20260824133913_add_rls_policies.sql
-- (not applied automatically). Once that runs, session_votes will need a
-- public-insert (voting is unauthenticated, from /perfil/[id]) + public/
-- authenticated-read policy added to it.

alter table sessions
  add column closed_at timestamptz;

create table session_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  voter_player_id uuid not null references players(id),
  craque_id uuid references players(id),
  insuportavel_id uuid references players(id),
  pereba_id uuid references players(id),
  created_at timestamptz not null default now(),
  unique (session_id, voter_player_id)
);

create index session_votes_session_id_idx on session_votes (session_id);
