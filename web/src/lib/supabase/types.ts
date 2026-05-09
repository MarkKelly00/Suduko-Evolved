/**
 * Public-safe shapes for the Sudoku Evolved Supabase project.
 * Sourced from /db/001_schema.sql, /db/004_views.sql.
 */

export type DuelMode = 'sprint_3min' | 'duel_5x5' | 'duel_9x9' | string;

export interface PublicProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  streak: number;
  levels_cleared: number;
  stars_total: number;
  crowns_total: number;
  best_time_trial_score: number | null;
  privacy_level: 'public' | 'friends' | 'private';
  created_at: string;
}

export interface DuelInvitePreview {
  invite_code: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | string;
  mode: DuelMode;
  expires_at: string;
  created_at: string;
  challenger_username: string | null;
  challenger_display_name: string | null;
  challenger_avatar_url: string | null;
}

export interface LeaderboardRow {
  rank: number;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  time_ms: number;
  stars?: number;
  crown?: boolean;
  completed_at: string;
}

export interface PublicLevelScore {
  user_id: string;
  level_id: string;
  score: number;
  time_ms: number;
  mistakes: number;
  hints: number;
  stars: number;
  crown: boolean;
  completed_at: string;
}
