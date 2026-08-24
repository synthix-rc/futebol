-- Links a `players` row to the `admin_profiles` row of the same person,
-- for admins who are themselves players in the pelada. Nullable — most
-- players are never an admin. UNIQUE so one admin can mirror to at most
-- one player row (and one player can't claim two different admins).
--
-- `on delete set null` rather than cascade: deleting an admin_profiles
-- row (which itself cascades from a deleted auth.users row) should just
-- unlink the player, not delete their whole player record and history.

alter table players
  add column admin_id uuid unique references admin_profiles(id) on delete set null;
