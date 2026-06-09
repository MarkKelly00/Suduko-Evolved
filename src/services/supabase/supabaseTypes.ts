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
          last_streak_date: string | null;
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
          last_streak_date?: string | null;
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
          last_streak_date?: string | null;
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
      duel_rooms: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          difficulty: string | null;
          expires_at: string | null;
          id: string;
          level_id: string | null;
          mode: string;
          puzzle_seed: string;
          start_at: string | null;
          status: string;
          updated_at: string;
          winner_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          difficulty?: string | null;
          expires_at?: string | null;
          id?: string;
          level_id?: string | null;
          mode: string;
          puzzle_seed: string;
          start_at?: string | null;
          status?: string;
          updated_at?: string;
          winner_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          difficulty?: string | null;
          expires_at?: string | null;
          id?: string;
          level_id?: string | null;
          mode?: string;
          puzzle_seed?: string;
          start_at?: string | null;
          status?: string;
          updated_at?: string;
          winner_id?: string | null;
        };
        Relationships: [];
      };
      duel_participants: {
        Row: {
          completed_units: Json;
          current_score: number;
          finished_at: string | null;
          id: string;
          joined_at: string;
          last_seen_at: string;
          opponent_slot: number;
          progress_percent: number;
          room_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          completed_units?: Json;
          current_score?: number;
          finished_at?: string | null;
          id?: string;
          joined_at?: string;
          last_seen_at?: string;
          opponent_slot: number;
          progress_percent?: number;
          room_id: string;
          status?: string;
          user_id: string;
        };
        Update: {
          completed_units?: Json;
          current_score?: number;
          finished_at?: string | null;
          id?: string;
          joined_at?: string;
          last_seen_at?: string;
          opponent_slot?: number;
          progress_percent?: number;
          room_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      duel_attempts: {
        Row: {
          app_background_count: number;
          completed_at: string;
          crown: boolean;
          final_grid: Json | null;
          hints: number;
          id: string;
          mistakes: number;
          move_count: number | null;
          move_timeline: Json | null;
          reconnect_count: number;
          room_id: string;
          score: number;
          stars: number | null;
          suspicious: boolean;
          time_ms: number;
          user_id: string;
        };
        Insert: {
          app_background_count?: number;
          completed_at?: string;
          crown?: boolean;
          final_grid?: Json | null;
          hints?: number;
          id?: string;
          mistakes?: number;
          move_count?: number | null;
          move_timeline?: Json | null;
          reconnect_count?: number;
          room_id: string;
          score: number;
          stars?: number | null;
          suspicious?: boolean;
          time_ms: number;
          user_id: string;
        };
        Update: {
          app_background_count?: number;
          completed_at?: string;
          crown?: boolean;
          final_grid?: Json | null;
          hints?: number;
          id?: string;
          mistakes?: number;
          move_count?: number | null;
          move_timeline?: Json | null;
          reconnect_count?: number;
          room_id?: string;
          score?: number;
          stars?: number | null;
          suspicious?: boolean;
          time_ms?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      matchmaking_queue: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          mode: string;
          room_id: string | null;
          skill_bracket: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          mode: string;
          room_id?: string | null;
          skill_bracket?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          mode?: string;
          room_id?: string | null;
          skill_bracket?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      duel_invites: {
        Row: {
          challenger_id: string;
          created_at: string;
          expires_at: string;
          id: string;
          invite_code: string;
          level_id: string | null;
          max_uses: number;
          mode: string;
          opponent_id: string | null;
          puzzle_seed: string;
          room_id: string | null;
          status: string;
          updated_at: string;
          use_count: number;
        };
        Insert: {
          challenger_id: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          invite_code: string;
          level_id?: string | null;
          max_uses?: number;
          mode: string;
          opponent_id?: string | null;
          puzzle_seed: string;
          room_id?: string | null;
          status?: string;
          updated_at?: string;
          use_count?: number;
        };
        Update: {
          challenger_id?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          invite_code?: string;
          level_id?: string | null;
          max_uses?: number;
          mode?: string;
          opponent_id?: string | null;
          puzzle_seed?: string;
          room_id?: string | null;
          status?: string;
          updated_at?: string;
          use_count?: number;
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
      delete_my_account: {
        Args: Record<string, never>;
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
      set_profile_streak: {
        Args: { p_last_date: string; p_streak: number; p_user_id: string };
        Returns: undefined;
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
      cancel_matchmaking: { Args: { p_mode: string }; Returns: undefined };
      create_duel_link: { Args: { p_mode: string }; Returns: Json };
      create_friend_duel: {
        Args: { p_mode: string; p_opponent_id: string };
        Returns: Json;
      };
      duel_seed_for_room: {
        Args: { p_mode: string; p_room_id: string };
        Returns: string;
      };
      forfeit_duel: { Args: { p_room_id: string }; Returns: undefined };
      heartbeat_duel: {
        Args: {
          p_completed_units?: Json;
          p_progress_percent: number;
          p_room_id: string;
          p_score: number;
        };
        Returns: undefined;
      };
      is_duel_participant: {
        Args: { p_room_id: string };
        Returns: boolean;
      };
      join_matchmaking: {
        Args: { p_mode: string; p_skill_bracket?: string };
        Returns: Json;
      };
      redeem_duel_invite: {
        Args: { p_invite_code: string };
        Returns: Json;
      };
      submit_duel_attempt: {
        Args: {
          p_app_background_count?: number;
          p_crown?: boolean;
          p_final_grid?: Json;
          p_hints: number;
          p_mistakes: number;
          p_move_count?: number;
          p_reconnect_count?: number;
          p_room_id: string;
          p_score: number;
          p_stars?: number;
          p_time_ms: number;
        };
        Returns: Json;
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

// ----- Duels --------------------------------------------------------
export type DuelRoom = Database['public']['Tables']['duel_rooms']['Row'];
export type DuelRoomInsert =
  Database['public']['Tables']['duel_rooms']['Insert'];
export type DuelParticipant =
  Database['public']['Tables']['duel_participants']['Row'];
export type DuelAttempt = Database['public']['Tables']['duel_attempts']['Row'];
export type DuelAttemptInsert =
  Database['public']['Tables']['duel_attempts']['Insert'];
export type DuelInvite = Database['public']['Tables']['duel_invites']['Row'];
export type MatchmakingQueueRow =
  Database['public']['Tables']['matchmaking_queue']['Row'];

/** Possible values for `duel_rooms.status`. */
export type DuelRoomStatus =
  | 'created'
  | 'waiting'
  | 'matched'
  | 'countdown'
  | 'active'
  | 'player_finished'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'disconnected';

/** Possible values for `duel_participants.status`. */
export type DuelParticipantStatus =
  | 'joined'
  | 'ready'
  | 'active'
  | 'finished'
  | 'disconnected'
  | 'forfeited';
