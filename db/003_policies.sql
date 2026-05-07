-- Sudoku Evolved — RLS policies
-- Run after 002_indexes.sql.

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_public
  ON public.profiles FOR SELECT
  TO authenticated, anon
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- INSERT is restricted to the handle_new_user trigger (SECURITY DEFINER).
-- DELETE is forbidden; soft-delete via deleted_at on the row update path.

-- ============================================================
-- friendships
-- ============================================================
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS friendships_select_participants ON public.friendships;
CREATE POLICY friendships_select_participants
  ON public.friendships FOR SELECT
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS friendships_insert_self_request ON public.friendships;
CREATE POLICY friendships_insert_self_request
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = (SELECT auth.uid())
    AND status = 'pending'
  );

-- Addressee can accept/decline; requester can update (e.g. cancel via DELETE
-- preferred). Either side can transition to 'blocked' if they own that side.
DROP POLICY IF EXISTS friendships_update_participants ON public.friendships;
CREATE POLICY friendships_update_participants
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  )
  WITH CHECK (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS friendships_delete_participants ON public.friendships;
CREATE POLICY friendships_delete_participants
  ON public.friendships FOR DELETE
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

-- ============================================================
-- level_scores (immutable history)
-- ============================================================
ALTER TABLE public.level_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS level_scores_select_public ON public.level_scores;
CREATE POLICY level_scores_select_public
  ON public.level_scores FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS level_scores_insert_self ON public.level_scores;
CREATE POLICY level_scores_insert_self
  ON public.level_scores FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- No UPDATE / DELETE policies => denied by default.

-- ============================================================
-- time_trial_scores (immutable history)
-- ============================================================
ALTER TABLE public.time_trial_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tt_scores_select_public ON public.time_trial_scores;
CREATE POLICY tt_scores_select_public
  ON public.time_trial_scores FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS tt_scores_insert_self ON public.time_trial_scores;
CREATE POLICY tt_scores_insert_self
  ON public.time_trial_scores FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================
-- challenges
-- ============================================================
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS challenges_select_participants ON public.challenges;
CREATE POLICY challenges_select_participants
  ON public.challenges FOR SELECT
  TO authenticated
  USING (
    challenger_id = (SELECT auth.uid())
    OR opponent_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS challenges_insert_challenger ON public.challenges;
CREATE POLICY challenges_insert_challenger
  ON public.challenges FOR INSERT
  TO authenticated
  WITH CHECK (challenger_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS challenges_update_participants ON public.challenges;
CREATE POLICY challenges_update_participants
  ON public.challenges FOR UPDATE
  TO authenticated
  USING (
    challenger_id = (SELECT auth.uid())
    OR opponent_id = (SELECT auth.uid())
  )
  WITH CHECK (
    challenger_id = (SELECT auth.uid())
    OR opponent_id = (SELECT auth.uid())
  );

-- ============================================================
-- challenge_attempts
-- ============================================================
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS challenge_attempts_select_participants ON public.challenge_attempts;
CREATE POLICY challenge_attempts_select_participants
  ON public.challenge_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND ((SELECT auth.uid()) IN (c.challenger_id, c.opponent_id))
    )
  );

DROP POLICY IF EXISTS challenge_attempts_insert_self_participant ON public.challenge_attempts;
CREATE POLICY challenge_attempts_insert_self_participant
  ON public.challenge_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND ((SELECT auth.uid()) IN (c.challenger_id, c.opponent_id))
    )
  );
