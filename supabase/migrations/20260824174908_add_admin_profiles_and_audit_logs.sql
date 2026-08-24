-- Admin profile (photo/nome/WhatsApp/e-mail for the admin's own account,
-- editable at /admin/configuracoes) and the Audit Trail that consumes it.
--
-- `admin_profiles.id` is a straight 1:1 extension of `auth.users` — not a
-- separate identity, just the columns Supabase's own users table doesn't
-- have room for. `on delete cascade` so a deleted auth user doesn't leave
-- an orphaned profile row behind.
--
-- `audit_logs.admin_id` is `on delete set null` rather than cascade: if an
-- admin profile is ever removed, their past actions should stay in the
-- trail (a "deleted admin" ghost row rather than losing the entry
-- entirely) — the FK just stops pointing anywhere.
--
-- RLS is intentionally NOT enabled here, matching every other table in
-- this schema right now — see the note in
-- 20260824133913_add_rls_policies.sql (not applied automatically; the user
-- runs it by hand). Once that runs, admin_profiles/audit_logs will need
-- their own authenticated-only policies added to it.

create table admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  phone text,
  email text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admin_profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- The Auditoria timeline always reads newest-first, and often scoped to
-- one admin's own actions.
create index audit_logs_created_at_idx on audit_logs (created_at desc);
create index audit_logs_admin_id_idx on audit_logs (admin_id);
