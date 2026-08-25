-- Adds 'inactive' (lesionado/afastado) to the player_status enum, so the
-- inline edit on /admin/jogadores can mark a player as neither actively
-- playing nor a pending signup, without touching the pending/active
-- lifecycle those two values already drive (registerPlayer, approvePlayer).
--
-- `ALTER TYPE ... ADD VALUE` must run as its own statement, not combined
-- with anything that reads the new value in the same transaction — this
-- migration only adds it, nothing here uses 'inactive' yet.

alter type player_status add value 'inactive';
