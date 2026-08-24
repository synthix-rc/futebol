-- Receipts on payments, and a new expenses ledger — the two sides of the
-- cash flow needed for the Previsibilidade indicator and the public
-- transparency portal.
--
-- No RLS here either, matching every other table in this schema.
--
-- The `comprovantes` storage bucket itself is NOT created by this
-- migration — per instructions, that's done by hand in the Supabase
-- dashboard afterward. Until it exists, receipt uploads will fail
-- (gracefully — see utils/storage.ts) but everything else in this
-- migration works independently of it.

alter table payments add column receipt_url text;

create type expense_category as enum (
  'campo',
  'material',
  'goleiro',
  'churrasco',
  'outros'
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: some expenses (e.g. a season-long equipment purchase) aren't
  -- tied to one Sunday's session.
  session_id uuid references sessions(id) on delete set null,
  description text not null,
  amount numeric(10, 2) not null,
  expense_date date not null,
  category expense_category not null,
  receipt_url text,
  -- Set when a player fronted the cost out of pocket, to be
  -- reimbursed/deducted later — null means the club/caixa paid directly.
  paid_by_player_id uuid references players(id) on delete set null,
  created_at timestamptz not null default now()
);

create index expenses_session_id_idx on expenses (session_id);
create index expenses_expense_date_idx on expenses (expense_date);
create index expenses_paid_by_player_id_idx on expenses (paid_by_player_id);
