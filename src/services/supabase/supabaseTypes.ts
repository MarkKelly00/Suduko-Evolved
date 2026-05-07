/**
 * Auto-generated Supabase database types.
 *
 * Regenerate with:
 *   npx supabase gen types typescript --project-id riwfohmydwwsgvnhnzfd \
 *     > src/services/supabase/supabaseTypes.ts
 *
 * Or via the MCP `generate_typescript_types` tool. Do not hand-edit.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      challenge_attempts: {
        Row: {
          challenge_id: string;
          completed_at: string;
          crown: boolean | null;
          hints: number;
          id: string;
          mistakes: number;
          move_count: number | null;
          score: number;
          stars: number | null;
          time_ms: number;
          user_id: string;
        };
        Insert: {
          challenge_id: string;
          completed_at?: string;
          crown?: boolean | null;
          hints: number;
          id?: string;
          mistakes: number;
          move_count?: number | null;
          score: number;
          stars?: number | null;
          time_ms: number;
          user_id: string;
        };
        Update: {
          challenge_id?: string;
          completed_at?: string;
          crown?: boolean | null;
          hints?: number;
          id?: string;
          mistakes?: number;
          move_count?: number | null;
          score?: number;
          stars?: number | null;
          time_ms?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'challenge_attempts_challenge_id_fkey';
            columns: ['challenge_id'];
            isOneToOne: false;
            referencedRelation: 'challenges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'challenge_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      challenges: {
        Row: {
          challenger_attempt_id: string | null;
          challenger_id: string;
          completed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          level_id: string | null;
          mode: string;
          opponent_attempt_id: string | null;
          opponent_id: string;
          puzzle_seed: string;
          sprint_mode_id: string | null;
          status: string;
          winner_id: string | null;
        };
        Insert: {
          challenger_attempt_id?: string | null;
          challenger_id: string;
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          level_id?: string | null;
          mode: string;
          opponent_attempt_id?: string | null;
          opponent_id: string;
          puzzle_seed: string;
          sprint_mode_id?: string | null;
          status?: string;
          winner_id?: string | null;
        };
        Update: {
          challenger_attempt_id?: string | null;
          challenger_id?: string;
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          level_id?: string | null;
          mode?: string;
          opponent_attempt_id?: string | null;
          opponent_id?: string;
          puzzle_seed?: string;
          sprint_mode_id?: string | null;
          status?: string;
          winner_id?: string | null;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          addressee_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          addressee_id: string;
          created_at?: string;
          id?: string;
          requester_id: string;
          status: string;
          updated_at?: string;
        };
        Update: {
          addressee_id?: string;
          created_at?: string;
          id?: string;
          requester_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      level_scores: {
        Row: {
          completed_at: string;
          crown: boolean;
          hints: number;
          id: string;
          level_id: string;
          mistakes: number;
          move_count: number | null;
          puzzle_seed: string;
          score: number;
          stars: number;
          time_ms: number;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          crown?: boolean;
          hints: number;
          id?: string;
          level_id: string;
          mistakes: number;
          move_count?: number | null;
          puzzle_seed: string;
          score: number;
          stars: number;
          time_ms: number;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          crown?: boolean;
          hints?: number;
          id?: string;
          level_id?: string;
          mistakes?: number;
          move_count?: number | null;
          puzzle_seed?: string;
          score?: number;
          stars?: number;
          time_ms?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          avatar_url: string | null;
          best_time_trial_score: number;
          created_at: string;
          crowns_total: number;
          deleted_at: string | null;
          display_name: string | null;
          id: string;
          levels_cleared: number;
          privacy_level: string;
          stars_total: number;
          streak: number;
          updated_at: string;
          username: string | null;
          username_normalized: string | null;
          xp: number;
        };
        Insert: {
          avatar_path?: string | null;
          avatar_url?: string | null;
          best_time_trial_score?: number;
          created_at?: string;
          crowns_total?: number;
          deleted_at?: string | null;
          display_name?: string | null;
          id: string;
          levels_cleared?: number;
          privacy_level?: string;
          stars_total?: number;
          streak?: number;
          updated_at?: string;
          username?: string | null;
          username_normalized?: string | null;
          xp?: number;
        };
        Update: {
          avatar_path?: string | null;
          avatar_url?: string | null;
          best_time_trial_score?: number;
          created_at?: string;
          crowns_total?: number;
          deleted_at?: string | null;
          display_name?: string | null;
          id?: string;
          levels_cleared?: number;
          privacy_level?: string;
          stars_total?: number;
          streak?: number;
          updated_at?: string;
          username?: string | null;
          username_normalized?: string | null;
          xp?: number;
        };
        Relationships: [];
      };
      time_trial_scores: {
        Row: {
          completed_at: string;
          hints: number | null;
          id: string;
          mistakes: number | null;
          mode: string;
          period_key: string;
          puzzle_seed: string | null;
          score: number;
          time_ms: number | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          hints?: number | null;
          id?: string;
          mistakes?: number | null;
          mode: string;
          period_key?: string;
          puzzle_seed?: string | null;
          score: number;
          time_ms?: number | null;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          hints?: number | null;
          id?: string;
          mistakes?: number | null;
          mode?: string;
          period_key?: string;
          puzzle_seed?: string | null;
          score?: number;
          time_ms?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      best_level_scores: {
        Row: {
          completed_at: string | null;
          crown: boolean | null;
          hints: number | null;
          id: string | null;
          level_id: string | null;
          mistakes: number | null;
          move_count: number | null;
          puzzle_seed: string | null;
          score: number | null;
          stars: number | null;
          time_ms: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      best_time_trial_scores: {
        Row: {
          completed_at: string | null;
          hints: number | null;
          id: string | null;
          mistakes: number | null;
          mode: string | null;
          period_key: string | null;
          puzzle_seed: string | null;
          score: number | null;
          time_ms: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      compute_challenge_winner: {
        Args: { p_challenge_id: string };
        Returns: string;
      };
      friend_leaderboard: {
        Args: { p_level_id: string; p_limit?: number; p_user_id: string };
        Returns: {
          avatar_url: string;
          completed_at: string;
          crown: boolean;
          display_name: string;
          rank: number;
          score: number;
          stars: number;
          time_ms: number;
          user_id: string;
          username: string;
        }[];
      };
      global_leaderboard: {
        Args: { p_level_id: string; p_limit?: number; p_offset?: number };
        Returns: {
          avatar_url: string;
          completed_at: string;
          crown: boolean;
          display_name: string;
          rank: number;
          score: number;
          stars: number;
          time_ms: number;
          user_id: string;
          username: string;
        }[];
      };
      my_rank: {
        Args: { p_level_id: string; p_user_id: string };
        Returns: {
          rank: number;
          total: number;
        }[];
      };
      set_profile_xp_max: {
        Args: { p_candidate: number; p_user_id: string };
        Returns: number;
      };
      time_trial_leaderboard: {
        Args: {
          p_limit?: number;
          p_mode: string;
          p_offset?: number;
          p_period_key?: string;
        };
        Returns: {
          avatar_url: string;
          completed_at: string;
          display_name: string;
          rank: number;
          score: number;
          time_ms: number;
          user_id: string;
          username: string;
        }[];
      };
      update_profile_aggregates: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience aliases used across the service layer.
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Friendship = Database['public']['Tables']['friendships']['Row'];
export type LevelScore = Database['public']['Tables']['level_scores']['Row'];
export type LevelScoreInsert = Database['public']['Tables']['level_scores']['Insert'];
export type TimeTrialScore = Database['public']['Tables']['time_trial_scores']['Row'];
export type TimeTrialScoreInsert =
  Database['public']['Tables']['time_trial_scores']['Insert'];

export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type ChallengeInsert = Database['public']['Tables']['challenges']['Insert'];
export type ChallengeAttempt = Database['public']['Tables']['challenge_attempts']['Row'];
export type ChallengeAttemptInsert =
  Database['public']['Tables']['challenge_attempts']['Insert'];

export type LeaderboardRow =
  Database['public']['Functions']['global_leaderboard']['Returns'][number];
export type TimeTrialLeaderboardRow =
  Database['public']['Functions']['time_trial_leaderboard']['Returns'][number];
