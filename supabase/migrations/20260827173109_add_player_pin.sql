-- RSVP PIN: a 4-digit PIN so one player can't confirm presence on behalf
-- of another. First RSVP with a given PIN "claims" it for that player;
-- every RSVP after that must match.
--
-- `players` already has an anon RLS policy that allows reading every row in
-- full (public_read_players — needed for the public RSVP name list), so a
-- row-level policy can't keep `pin` itself secret: RLS controls which ROWS
-- a role sees, not which COLUMNS. `has_pin` is a generated column so the
-- public list can show "already has a PIN" without the app ever needing to
-- read the real value for that purpose.
--
-- `revoke select (pin) on players from anon` was tried here and does NOT
-- work in this environment: `anon` holds its access to `players` (and
-- every other public-schema table) via a blanket TABLE-level SELECT grant,
-- and Postgres column-level REVOKE can only remove a privilege that was
-- granted at the *column* level — it cannot carve an exception out of a
-- broader table-level grant. Verified directly with `has_column_privilege`
-- and a throwaway scratch table: the revoke runs without error and changes
-- nothing. Making `pin` genuinely unreadable via a direct anon-key REST
-- call would mean rebuilding `anon`'s access to this table (and every
-- other public table it touches) as an explicit column allowlist instead
-- of the current blanket grant — a real, larger security hardening this
-- schema could use, but a project-wide change well beyond this migration;
-- flagged to the team as a follow-up rather than attempted piecemeal here.
--
-- What IS enforced: this app's own server-side code never selects `pin` in
-- any public-facing query (only `has_pin`), so the real value never enters
-- a page's render output or reaches the browser through this app. And the
-- anon role has no UPDATE policy on `players` at all today (the public
-- RSVP flow only ever needed INSERT, via public_insert_players) — rather
-- than opening a broad anon UPDATE policy just to let someone set their
-- own PIN (which would let that same policy rewrite *any* column on *any*
-- player row from a direct anon-key REST call), verify_or_set_player_pin()
-- below is SECURITY DEFINER: it runs as the function owner, bypassing RLS
-- the same way the table owner always could, so it's the one sanctioned
-- path — for anon or authenticated — to compare or set `pin`, and it only
-- ever returns a boolean.
alter table players
  add column pin varchar(4)
    constraint players_pin_format_check check (pin is null or pin ~ '^[0-9]{4}$'),
  add column has_pin boolean generated always as (pin is not null) stored;

create or replace function public.verify_or_set_player_pin(p_player_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_pin text;
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN inválido.';
  end if;

  select pin into v_current_pin
  from players
  where id = p_player_id
  for update;

  if not found then
    raise exception 'Jogador não encontrado.';
  end if;

  if v_current_pin is null then
    update players set pin = p_pin where id = p_player_id;
    return true;
  end if;

  if v_current_pin <> p_pin then
    raise exception 'PIN incorreto.';
  end if;

  return true;
end;
$$;

revoke all on function public.verify_or_set_player_pin(uuid, text) from public;
grant execute on function public.verify_or_set_player_pin(uuid, text) to anon, authenticated;
