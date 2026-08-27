-- "Vencedor no Sorteio": when a match is recorded as a draw, the admin
-- picks which team wins the coin-flip/sorteio for rotation purposes. The
-- match itself stays a genuine 'draw' in matches.winner_team (stats/history
-- must not lie about the result on the field) — this column is a separate,
-- rotation-only signal, only ever set alongside winner_team = 'draw'.
alter table matches
  add column tiebreak_winner_team text
  constraint matches_tiebreak_winner_team_check
    check (tiebreak_winner_team in ('team_a', 'team_b'));

comment on column matches.tiebreak_winner_team is
  'Sorteio winner for a drawn match, used by the rotation engine as the effective winner. Null unless winner_team = ''draw''.';
