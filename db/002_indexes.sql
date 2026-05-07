-- Sudoku Evolved — indexes and uniqueness constraints
-- Run after 001_schema.sql.

-- profiles --------------------------------------------------
-- username_normalized already UNIQUE via column constraint; add an explicit
-- name for the supporting index in case future tooling references it.
CREATE INDEX IF NOT EXISTS profiles_display_name_idx
  ON public.profiles (display_name);

-- friendships ----------------------------------------------
CREATE INDEX IF NOT EXISTS friendships_requester_idx
  ON public.friendships (requester_id);

CREATE INDEX IF NOT EXISTS friendships_addressee_idx
  ON public.friendships (addressee_id);

CREATE INDEX IF NOT EXISTS friendships_status_idx
  ON public.friendships (status);

-- Prevent duplicate symmetric pairs regardless of who initiated.
CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique_pair
  ON public.friendships (LEAST(requester_id, addressee_id),
                         GREATEST(requester_id, addressee_id));

-- level_scores ---------------------------------------------
CREATE INDEX IF NOT EXISTS level_scores_level_score_idx
  ON public.level_scores (level_id, score DESC, time_ms ASC);

CREATE INDEX IF NOT EXISTS level_scores_user_level_idx
  ON public.level_scores (user_id, level_id);

CREATE INDEX IF NOT EXISTS level_scores_user_idx
  ON public.level_scores (user_id);

-- time_trial_scores ----------------------------------------
CREATE INDEX IF NOT EXISTS tt_scores_mode_period_score_idx
  ON public.time_trial_scores (mode, period_key, score DESC, time_ms ASC);

CREATE INDEX IF NOT EXISTS tt_scores_user_mode_period_idx
  ON public.time_trial_scores (user_id, mode, period_key);

-- challenges ----------------------------------------------
CREATE INDEX IF NOT EXISTS challenges_challenger_idx
  ON public.challenges (challenger_id);

CREATE INDEX IF NOT EXISTS challenges_opponent_idx
  ON public.challenges (opponent_id);

CREATE INDEX IF NOT EXISTS challenges_status_idx
  ON public.challenges (status);

CREATE INDEX IF NOT EXISTS challenges_expires_at_idx
  ON public.challenges (expires_at)
  WHERE status IN ('pending', 'accepted');

-- challenge_attempts ---------------------------------------
CREATE INDEX IF NOT EXISTS challenge_attempts_challenge_idx
  ON public.challenge_attempts (challenge_id);

CREATE INDEX IF NOT EXISTS challenge_attempts_user_idx
  ON public.challenge_attempts (user_id);
