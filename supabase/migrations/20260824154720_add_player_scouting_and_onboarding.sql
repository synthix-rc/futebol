-- Scouting metrics + public self-registration fields for `players`.
-- (match_participations.goals/assists already exist — nothing to add there.)
--
-- Two deliberate deviations from a literal reading of the spec, both to
-- avoid breaking the ~29 real players already in this table:
--
-- 1. `phone` is added NULLABLE, not NOT NULL. A straight NOT NULL would
--    fail immediately against existing rows (no phone data exists for
--    them, and there's no sensible default to backfill with — an empty
--    string would just be a NOT NULL constraint lying about being
--    enforced). "Required" is enforced instead where it actually can be:
--    app-level, in the /cadastro Server Action for new signups.
-- 2. `status` defaults to 'pending' for new rows (matches the /cadastro
--    flow), but every row that already exists is backfilled to 'active'
--    immediately below — they're established members, not signups
--    waiting on admin approval.

create type player_status as enum ('pending', 'active');

alter table players
  add column speed_rating int not null default 3 check (speed_rating between 1 and 5),
  add column stamina_rating int not null default 3 check (stamina_rating between 1 and 5),
  add column phone text,
  add column status player_status not null default 'pending',
  add column email text,
  add column birth_day int check (birth_day between 1 and 31),
  add column birth_month int check (birth_month between 1 and 12),
  add column photo_url text;

update players set status = 'active';
