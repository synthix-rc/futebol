export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          expense_date: string
          id: string
          paid_by_player_id: string | null
          receipt_url: string | null
          session_id: string | null
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          expense_date: string
          id?: string
          paid_by_player_id?: string | null
          receipt_url?: string | null
          session_id?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          paid_by_player_id?: string | null
          receipt_url?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_paid_by_player_id_fkey"
            columns: ["paid_by_player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "expenses_paid_by_player_id_fkey"
            columns: ["paid_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participations: {
        Row: {
          assists: number | null
          goals: number | null
          id: string
          is_completing: boolean | null
          match_id: string | null
          player_id: string | null
          team: string
        }
        Insert: {
          assists?: number | null
          goals?: number | null
          id?: string
          is_completing?: boolean | null
          match_id?: string | null
          player_id?: string | null
          team: string
        }
        Update: {
          assists?: number | null
          goals?: number | null
          id?: string
          is_completing?: boolean | null
          match_id?: string | null
          player_id?: string | null
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_participations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          finished_at: string | null
          id: string
          session_id: string | null
          status: Database["public"]["Enums"]["match_status"] | null
          team_a_name: string | null
          team_b_name: string | null
          winner_team: string | null
        }
        Insert: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["match_status"] | null
          team_a_name?: string | null
          team_b_name?: string | null
          winner_team?: string | null
        }
        Update: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["match_status"] | null
          team_a_name?: string | null
          team_b_name?: string | null
          winner_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          player_id: string
          receipt_url: string | null
          reference_month: string
          session_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          player_id: string
          receipt_url?: string | null
          reference_month: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          player_id?: string
          receipt_url?: string | null
          reference_month?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type?: Database["public"]["Enums"]["payment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          atk_rating: number | null
          created_at: string | null
          def_rating: number | null
          id: string
          mid_rating: number | null
          name: string
          type: Database["public"]["Enums"]["player_type"] | null
          updated_at: string | null
        }
        Insert: {
          atk_rating?: number | null
          created_at?: string | null
          def_rating?: number | null
          id?: string
          mid_rating?: number | null
          name: string
          type?: Database["public"]["Enums"]["player_type"] | null
          updated_at?: string | null
        }
        Update: {
          atk_rating?: number | null
          created_at?: string | null
          def_rating?: number | null
          id?: string
          mid_rating?: number | null
          name?: string
          type?: Database["public"]["Enums"]["player_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      session_presences: {
        Row: {
          check_in_timestamp: string | null
          games_played_today: number | null
          id: string
          player_id: string | null
          rsvp_timestamp: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["rsvp_status"] | null
        }
        Insert: {
          check_in_timestamp?: string | null
          games_played_today?: number | null
          id?: string
          player_id?: string | null
          rsvp_timestamp?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"] | null
        }
        Update: {
          check_in_timestamp?: string | null
          games_played_today?: number | null
          id?: string
          player_id?: string | null
          rsvp_timestamp?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "session_presences_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "session_presences_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_presences_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          session_date: string
          status: Database["public"]["Enums"]["session_status"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          session_date: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          session_date?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Relationships: []
      }
    }
    Views: {
      player_stats: {
        Row: {
          name: string | null
          player_id: string | null
          times_completed_team: number | null
          total_assists: number | null
          total_goals: number | null
          total_matches_played: number | null
          total_wins: number | null
          type: Database["public"]["Enums"]["player_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      expense_category:
        | "campo"
        | "material"
        | "goleiro"
        | "churrasco"
        | "outros"
      match_status: "in_progress" | "finished" | "canceled"
      payment_status: "pendente" | "pago"
      payment_type: "mensalidade" | "diaria"
      player_type: "mensalista" | "diarista"
      rsvp_status:
        | "pending_waitlist"
        | "confirmed"
        | "cut_off"
        | "checked_in_field"
      session_status: "open_for_rsvp" | "in_progress" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      expense_category: ["campo", "material", "goleiro", "churrasco", "outros"],
      match_status: ["in_progress", "finished", "canceled"],
      payment_status: ["pendente", "pago"],
      payment_type: ["mensalidade", "diaria"],
      player_type: ["mensalista", "diarista"],
      rsvp_status: [
        "pending_waitlist",
        "confirmed",
        "cut_off",
        "checked_in_field",
      ],
      session_status: ["open_for_rsvp", "in_progress", "closed"],
    },
  },
} as const

// --- Application-level convenience aliases --------------------------------
// Generated by `supabase gen types typescript` — regenerate with:
//   npx --yes supabase gen types typescript --project-id "njchgnrgofpjxsugeadt" > types/supabase.ts
// (the `--yes` skips the "Need to install..." prompt that corrupted this
// file previously; make sure the alias block below survives the overwrite).
//
// `team` (match_participations) and `winner_team` (matches) are plain
// `text` columns in the DB, not real Postgres enums, so they stay as
// app-level literal unions matching the values this codebase writes.
export type PlayerType = Enums<"player_type">;
export type PresenceStatus = Enums<"rsvp_status">;
export type MatchStatus = Enums<"match_status">;
export type SessionStatus = Enums<"session_status">;
export type PaymentType = Enums<"payment_type">;
export type PaymentStatus = Enums<"payment_status">;
export type ExpenseCategory = Enums<"expense_category">;
export type MatchTeam = "A" | "B";
export type WinnerTeam = "team_a" | "team_b" | "draw";
