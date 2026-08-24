-- Adds an explicit lifecycle status to `sessions`, replacing the implicit
-- "the row with is_active = true" convention the app relied on until now.
--
-- Additive only: `is_active` is left in place (unused by the app going
-- forward) rather than dropped, so nothing else that might reference it
-- (policies, other tooling) breaks. It can be dropped in a later migration
-- once that's confirmed safe.

create type session_status as enum ('open_for_rsvp', 'in_progress', 'closed');

alter table sessions
  add column status session_status not null default 'open_for_rsvp';

-- Backfill existing rows from the old boolean. This is a best-effort
-- mapping: `is_active = true` becomes 'in_progress' (matching how the app
-- has been using it as "the one live session"); everything else becomes
-- 'closed', since a pre-migration row gives no way to tell "not yet
-- happened" apart from "already happened".
update sessions set status = 'in_progress' where is_active = true;
update sessions set status = 'closed' where is_active is distinct from true;
