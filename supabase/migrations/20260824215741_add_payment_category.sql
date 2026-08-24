-- BBQ Module: distinguishes a payment collected for the regular
-- game/mensalidade ('campo') from one collected as a churrasco
-- contribution ('churrasco') — e.g. an admin marking a diária paid on a
-- day the group is also chipping in for a BBQ.
--
-- Plain `text`, not a real Postgres enum — same convention already used
-- for match_participations.team / matches.winner_team (see the comment
-- above the app-level PaymentCategory alias in types/supabase.ts):
-- validated at the Server Action, not the DB.
--
-- `not null default 'campo'` backfills every existing payment as 'campo'
-- automatically — they all predate the BBQ module, so that's the correct
-- historical value, not just a placeholder.

alter table payments
  add column category text not null default 'campo';
