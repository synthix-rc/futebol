-- Completes the RLS coverage started in
-- 20260824133913_add_rls_policies.sql — that file predates admin_profiles,
-- audit_logs, session_votes, and the /perfil/[id] Magic Link's public
-- stats read, so it doesn't account for any of them. Apply this together
-- with that file, in order.

-- --- admin_profiles / audit_logs: authenticated-only, same "full access"
-- pattern as the rest of the admin surface (see the original file's
-- authenticated_full_access_* policies). Nothing public ever reads or
-- writes either table.

alter table admin_profiles enable row level security;
alter table audit_logs enable row level security;

create policy "authenticated_full_access_admin_profiles"
  on admin_profiles for all to authenticated using (true) with check (true);

create policy "authenticated_full_access_audit_logs"
  on audit_logs for all to authenticated using (true) with check (true);

-- --- session_votes: submitSessionVotes (app/actions/voting.ts) is a
-- deliberately public, unauthenticated action — the "Urna da Rodada"
-- ballot on /perfil/[id] — so anon needs both to read (check "did I
-- already vote", tally the results view) and to insert (cast a vote).
-- Nothing here is ever updated or deleted, by anyone, so those stay
-- covered only by the authenticated_full_access policy below.

alter table session_votes enable row level security;

create policy "authenticated_full_access_session_votes"
  on session_votes for all to authenticated using (true) with check (true);

create policy "public_read_session_votes"
  on session_votes for select to anon using (true);

create policy "public_insert_session_votes"
  on session_votes for insert to anon with check (true);

-- --- matches / match_participations: the original file kept both
-- authenticated-only "since no public route needs them" — no longer true,
-- /perfil/[id] reads both (via a nested match_participations -> matches
-- select) for a player's Jogos/Gols/Assistências. Scoped to *finished*
-- matches only, so an in-progress match's team composition/score stays
-- invisible to the public, matching exactly what that page actually
-- displays.

create policy "public_read_finished_matches"
  on matches for select to anon
  using (status = 'finished');

create policy "public_read_finished_match_participations"
  on match_participations for select to anon
  using (
    exists (
      select 1 from matches m
      where m.id = match_participations.match_id
        and m.status = 'finished'
    )
  );

-- --- Storage: both buckets already exist (created by hand in the
-- dashboard, see utils/storage.ts) and already default to RLS-enabled
-- with zero policies, which is why every upload has been failing —
-- public reads work regardless (public buckets), but writes need an
-- explicit policy per bucket/role.
--
-- avatars: written from two places — the public /cadastro form (anon)
-- and the admin's own profile photo at /admin/configuracoes
-- (authenticated, added after the original file's draft only covered
-- the anon case).
-- comprovantes: written only from admin-gated financeiro forms
-- (authenticated only, never public).

create policy "public_upload_avatars"
  on storage.objects for insert to anon
  with check (bucket_id = 'avatars');

create policy "authenticated_upload_avatars"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars');

create policy "authenticated_upload_comprovantes"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes');
