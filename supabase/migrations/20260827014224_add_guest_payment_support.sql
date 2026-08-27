-- "Receita Avulsa": diaristas stop being registered as players at all —
-- an ad-hoc payment now only needs a guest name, not a `players` row to
-- attach to. `player_id` becomes optional and `guest_name` carries the
-- name for these rows instead.
--
-- The CHECK keeps every payment identifiable by exactly one of the two —
-- never neither (an orphaned payment nobody can attribute) — a payment
-- for a real player still always sets player_id and leaves guest_name
-- null, same as before this migration.

alter table payments
  add column guest_name text,
  alter column player_id drop not null,
  add constraint payments_has_payer check (player_id is not null or guest_name is not null);
