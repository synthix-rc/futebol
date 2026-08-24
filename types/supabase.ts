// Hand-written mirror of the database schema described for this project.
//
// The Supabase clients in utils/supabase/ are intentionally *not* generic
// over a `Database` type: the installed @supabase/postgrest-js parses
// `.select()` strings at the type level against each table's declared
// `Relationships` (foreign keys), and hand-guessing those constraint names
// is brittle and easy to get subtly wrong. Once you have DB access, run:
//
//   supabase gen types typescript --project-id <id> > types/supabase.ts
//
// and switch `createClient()` in utils/supabase/client.ts and server.ts to
// `createBrowserClient<Database>(...)` / `createServerClient<Database>(...)`.
//
// Until then, these plain row/enum types are used for explicit annotations
// at the call sites that need them.

export type PlayerType = "mensalista" | "diarista";

export type PresenceStatus =
  | "pending_waitlist"
  | "confirmed"
  | "checked_in_field";

export type MatchStatus = "in_progress" | "finished";

export type MatchTeam = "A" | "B";

export type WinnerTeam = "team_a" | "team_b" | "draw";

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  def_rating: number;
  mid_rating: number;
  atk_rating: number;
}

export interface Session {
  id: string;
  session_date: string;
  is_active: boolean;
}

export interface SessionPresence {
  id: string;
  session_id: string;
  player_id: string;
  status: PresenceStatus;
  check_in_timestamp: string | null;
  games_played_today: number | null;
}

export interface Match {
  id: string;
  session_id: string;
  status: MatchStatus;
  team_a_name: string;
  team_b_name: string;
  winner_team: WinnerTeam | null;
}

export interface MatchParticipation {
  id: string;
  match_id: string;
  player_id: string;
  team: MatchTeam;
  is_completing: boolean | null;
}
