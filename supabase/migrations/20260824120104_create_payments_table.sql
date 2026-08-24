-- Financial module: tracks diária and mensalidade payments per player.
--
-- No RLS is enabled here, matching every other table in this schema (all
-- of which the app already reads/writes with only the anon key) — flag
-- this to the project owner if that assumption turns out to be wrong.

create type payment_type as enum ('mensalidade', 'diaria');
create type payment_status as enum ('pendente', 'pago');

create table payments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  -- Nullable: a mensalidade isn't tied to a specific day's session.
  session_id uuid references sessions(id) on delete set null,
  amount numeric(10, 2) not null,
  type payment_type not null,
  status payment_status not null default 'pendente',
  -- 'YYYY-MM' — which month this payment counts toward.
  reference_month text not null,
  created_at timestamptz not null default now()
);

create index payments_player_id_idx on payments (player_id);
create index payments_session_id_idx on payments (session_id);
create index payments_reference_month_idx on payments (reference_month);
