-- ============================================================
-- 010_streak_sync.sql
-- Daily play-streak cloud sync.
--
-- The streak itself is a LOCAL calendar-day counter (see
-- src/game/util/streakDate.ts): +1 on a consecutive day played, reset to 1
-- after a missed day. The cloud copy here persists it across reinstalls /
-- devices and surfaces it on friends' profiles.
--
-- `profiles.streak` already exists (db/001_schema.sql). We add the date the
-- streak was last advanced so the client can merge across devices by recency
-- rather than a naive max, and an RPC the client calls to advance its own
-- cloud streak (mirrors set_profile_xp_max's security model).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_streak_date date;

-- set_profile_streak(user_id, streak, last_date)
-- Advances the caller's OWN streak only. SECURITY INVOKER + auth.uid() guard,
-- matching set_profile_xp_max. Moves the value forward in time only: a write
-- whose date is older than the stored one is ignored, so a stale device can't
-- clobber a fresher streak from another device.
CREATE OR REPLACE FUNCTION public.set_profile_streak(
  p_user_id   uuid,
  p_streak    int,
  p_last_date date
)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF p_user_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: can only update own streak';
  END IF;
  UPDATE public.profiles
     SET streak = GREATEST(0, COALESCE(p_streak, 0)),
         last_streak_date = p_last_date
   WHERE id = p_user_id
     AND p_last_date IS NOT NULL
     AND (last_streak_date IS NULL OR p_last_date >= last_streak_date);
END;
$$;
