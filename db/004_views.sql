-- Sudoku Evolved — leaderboard views and RPC functions
-- Run after 003_policies.sql.

-- ============================================================
-- best_level_scores
-- One row per (user_id, level_id) — the user's personal best.
-- Tie-break: higher score, then lower time, then earlier completion.
-- ============================================================
CREATE OR REPLACE VIEW public.best_level_scores AS
SELECT DISTINCT ON (user_id, level_id)
  id, user_id, level_id, puzzle_seed,
  score, time_ms, mistakes, hints, stars, crown, move_count, completed_at
FROM public.level_scores
ORDER BY user_id, level_id, score DESC, time_ms ASC, completed_at ASC;

-- ============================================================
-- best_time_trial_scores
-- One row per (user_id, mode, period_key).
-- ============================================================
CREATE OR REPLACE VIEW public.best_time_trial_scores AS
SELECT DISTINCT ON (user_id, mode, period_key)
  id, user_id, mode, period_key,
  score, time_ms, mistakes, hints, puzzle_seed, completed_at
FROM public.time_trial_scores
ORDER BY user_id, mode, period_key, score DESC, time_ms ASC, completed_at ASC;

-- ============================================================
-- global_leaderboard(level_id, limit)
-- Ordered top scores per level, joined to public profile fields.
-- ============================================================
CREATE OR REPLACE FUNCTION public.global_leaderboard(
  p_level_id text,
  p_limit    int DEFAULT 50,
  p_offset   int DEFAULT 0
)
RETURNS TABLE (
  rank          int,
  user_id       uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  score         int,
  time_ms       int,
  stars         int,
  crown         boolean,
  completed_at  timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    (ROW_NUMBER() OVER (ORDER BY b.score DESC, b.time_ms ASC, b.completed_at ASC))::int AS rank,
    b.user_id, p.username, p.display_name, p.avatar_url,
    b.score, b.time_ms, b.stars, b.crown, b.completed_at
  FROM public.best_level_scores b
  JOIN public.profiles p ON p.id = b.user_id AND p.deleted_at IS NULL
  WHERE b.level_id = p_level_id
  ORDER BY b.score DESC, b.time_ms ASC, b.completed_at ASC
  LIMIT p_limit OFFSET p_offset;
$$;

-- ============================================================
-- friend_leaderboard(user_id, level_id, limit)
-- Self + accepted friends only.
-- ============================================================
CREATE OR REPLACE FUNCTION public.friend_leaderboard(
  p_user_id   uuid,
  p_level_id  text,
  p_limit     int DEFAULT 50
)
RETURNS TABLE (
  rank          int,
  user_id       uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  score         int,
  time_ms       int,
  stars         int,
  crown         boolean,
  completed_at  timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH friend_set AS (
    SELECT p_user_id AS uid
    UNION
    SELECT CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
      FROM public.friendships f
     WHERE f.status = 'accepted'
       AND (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
  )
  SELECT
    (ROW_NUMBER() OVER (ORDER BY b.score DESC, b.time_ms ASC, b.completed_at ASC))::int AS rank,
    b.user_id, p.username, p.display_name, p.avatar_url,
    b.score, b.time_ms, b.stars, b.crown, b.completed_at
  FROM public.best_level_scores b
  JOIN friend_set fs ON fs.uid = b.user_id
  JOIN public.profiles p ON p.id = b.user_id AND p.deleted_at IS NULL
  WHERE b.level_id = p_level_id
  ORDER BY b.score DESC, b.time_ms ASC, b.completed_at ASC
  LIMIT p_limit;
$$;

-- ============================================================
-- time_trial_leaderboard(mode, period_key, limit)
-- ============================================================
CREATE OR REPLACE FUNCTION public.time_trial_leaderboard(
  p_mode        text,
  p_period_key  text DEFAULT '',
  p_limit       int  DEFAULT 50,
  p_offset      int  DEFAULT 0
)
RETURNS TABLE (
  rank          int,
  user_id       uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  score         int,
  time_ms       int,
  completed_at  timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    (ROW_NUMBER() OVER (ORDER BY b.score DESC, b.time_ms ASC, b.completed_at ASC))::int AS rank,
    b.user_id, p.username, p.display_name, p.avatar_url,
    b.score, b.time_ms, b.completed_at
  FROM public.best_time_trial_scores b
  JOIN public.profiles p ON p.id = b.user_id AND p.deleted_at IS NULL
  WHERE b.mode = p_mode AND b.period_key = p_period_key
  ORDER BY b.score DESC, b.time_ms ASC, b.completed_at ASC
  LIMIT p_limit OFFSET p_offset;
$$;

-- ============================================================
-- my_rank(user_id, level_id)
-- ============================================================
CREATE OR REPLACE FUNCTION public.my_rank(
  p_user_id   uuid,
  p_level_id  text
)
RETURNS TABLE (rank int, total int)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH ordered AS (
    SELECT
      user_id,
      ROW_NUMBER() OVER (ORDER BY score DESC, time_ms ASC, completed_at ASC) AS r
    FROM public.best_level_scores
    WHERE level_id = p_level_id
  )
  SELECT
    (SELECT r FROM ordered WHERE user_id = p_user_id)::int AS rank,
    (SELECT COUNT(*) FROM ordered)::int AS total;
$$;

-- ============================================================
-- set_profile_xp_max(user_id, candidate)
-- Used by local-to-cloud migration so re-logins don't double-count XP.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_profile_xp_max(
  p_user_id   uuid,
  p_candidate int
)
RETURNS int
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  result int;
BEGIN
  IF p_user_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: can only update own XP';
  END IF;
  UPDATE public.profiles
     SET xp = GREATEST(xp, COALESCE(p_candidate, 0))
   WHERE id = p_user_id
   RETURNING xp INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- update_profile_aggregates(user_id)
-- Re-derives stars_total / crowns_total / levels_cleared / best_time_trial_score
-- from the score history. Called by scoreSubmissionService after each insert.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_profile_aggregates(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF p_user_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: can only update own aggregates';
  END IF;

  UPDATE public.profiles p
     SET stars_total = COALESCE((
           SELECT SUM(stars) FROM public.best_level_scores WHERE user_id = p_user_id
         ), 0),
         crowns_total = COALESCE((
           SELECT COUNT(*)::int FROM public.best_level_scores
            WHERE user_id = p_user_id AND crown
         ), 0),
         levels_cleared = COALESCE((
           SELECT COUNT(*)::int FROM public.best_level_scores WHERE user_id = p_user_id
         ), 0),
         best_time_trial_score = COALESCE((
           SELECT MAX(score) FROM public.best_time_trial_scores
            WHERE user_id = p_user_id
         ), 0)
   WHERE p.id = p_user_id;
END;
$$;

-- ============================================================
-- compute_challenge_winner(challenge_id)
-- Tie-break: score desc -> time asc -> mistakes asc -> hints asc.
-- Mirrors src/game/sync/challengeWinner.ts on the client.
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_challenge_winner(p_challenge_id uuid)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  a public.challenge_attempts;
  b public.challenge_attempts;
  c public.challenges;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id = p_challenge_id;
  IF c.id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO a FROM public.challenge_attempts
   WHERE challenge_id = p_challenge_id AND user_id = c.challenger_id;
  SELECT * INTO b FROM public.challenge_attempts
   WHERE challenge_id = p_challenge_id AND user_id = c.opponent_id;

  IF a.id IS NULL OR b.id IS NULL THEN RETURN NULL; END IF;

  IF a.score <> b.score THEN
    RETURN CASE WHEN a.score > b.score THEN c.challenger_id ELSE c.opponent_id END;
  END IF;
  IF a.time_ms <> b.time_ms THEN
    RETURN CASE WHEN a.time_ms < b.time_ms THEN c.challenger_id ELSE c.opponent_id END;
  END IF;
  IF a.mistakes <> b.mistakes THEN
    RETURN CASE WHEN a.mistakes < b.mistakes THEN c.challenger_id ELSE c.opponent_id END;
  END IF;
  IF a.hints <> b.hints THEN
    RETURN CASE WHEN a.hints < b.hints THEN c.challenger_id ELSE c.opponent_id END;
  END IF;
  RETURN NULL; -- draw
END;
$$;

-- ============================================================
-- challenges trigger: auto-resolve when both attempts present
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_challenge_on_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.challenges;
  attempt_count int;
  winner uuid;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id = NEW.challenge_id;
  IF c.id IS NULL THEN RETURN NEW; END IF;

  -- Mark accepted on the first opponent attempt if still pending.
  IF c.status = 'pending' AND NEW.user_id = c.opponent_id THEN
    UPDATE public.challenges
       SET status = 'accepted'
     WHERE id = c.id AND status = 'pending';
  END IF;

  -- Cache the attempt id on the challenge row.
  IF NEW.user_id = c.challenger_id THEN
    UPDATE public.challenges SET challenger_attempt_id = NEW.id WHERE id = c.id;
  ELSIF NEW.user_id = c.opponent_id THEN
    UPDATE public.challenges SET opponent_attempt_id = NEW.id WHERE id = c.id;
  END IF;

  SELECT COUNT(*) INTO attempt_count
    FROM public.challenge_attempts
   WHERE challenge_id = c.id;

  IF attempt_count >= 2 THEN
    winner := public.compute_challenge_winner(c.id);
    UPDATE public.challenges
       SET status = 'completed',
           winner_id = winner,
           completed_at = now()
     WHERE id = c.id AND status <> 'completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS challenge_attempts_resolve ON public.challenge_attempts;
CREATE TRIGGER challenge_attempts_resolve
AFTER INSERT ON public.challenge_attempts
FOR EACH ROW EXECUTE FUNCTION public.resolve_challenge_on_attempt();
