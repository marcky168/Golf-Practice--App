// Hand-written placeholder until you run:
//   supabase gen types typescript --linked > types/supabase.ts
//
// The shape below matches what @supabase/postgrest-js / @supabase/supabase-js
// expect for `Database['public'] extends GenericSchema` to succeed:
// - Each table must declare Row, Insert, Update, and Relationships
// - Schema must declare Tables, Views, Functions records of the right shape
//
// Avoid `Database["public"]["Tables"][...]["Insert"]` self-references here
// because they have been observed to break the structural `extends` check
// during typechecking on Vercel builds.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ClubEntry = {
  club: string;
  carry: number;
};

type PracticeSessionType = "block" | "random" | "mixed" | "game" | "planned";

type ProfileRow = {
  id: string;
  full_name: string | null;
  club_bag: ClubEntry[];
  created_at: string;
};

type ProfileInsert = {
  id: string;
  full_name?: string | null;
  club_bag?: ClubEntry[];
};

type ProfileUpdate = {
  id?: string;
  full_name?: string | null;
  club_bag?: ClubEntry[];
};

type PracticeSessionRow = {
  id: string;
  user_id: string;
  type: PracticeSessionType;
  title: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  balls_used: number | null;
  overall_feel: number | null;
  notes: string | null;
  reflection: Json | null;
  config: Json | null;
  score: number | null;
  created_at: string;
};

type PracticeSessionInsert = {
  id?: string;
  user_id: string;
  type: PracticeSessionType;
  title: string;
  started_at?: string;
  ended_at?: string | null;
  duration_minutes?: number | null;
  balls_used?: number | null;
  overall_feel?: number | null;
  notes?: string | null;
  reflection?: Json | null;
  config?: Json | null;
  score?: number | null;
};

type PracticeSessionUpdate = {
  id?: string;
  user_id?: string;
  type?: PracticeSessionType;
  title?: string;
  started_at?: string;
  ended_at?: string | null;
  duration_minutes?: number | null;
  balls_used?: number | null;
  overall_feel?: number | null;
  notes?: string | null;
  reflection?: Json | null;
  config?: Json | null;
  score?: number | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      practice_sessions: {
        Row: PracticeSessionRow;
        Insert: PracticeSessionInsert;
        Update: PracticeSessionUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
