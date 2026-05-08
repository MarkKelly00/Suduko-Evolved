-- Sudoku Evolved — security hardening
-- Addresses Supabase advisor findings:
--   * security_definer_view (best_level_scores, best_time_trial_scores)
--   * function_search_path_mutable (set_updated_at, enforce_username_normalized)
--   * public_bucket_allows_listing (avatars)
--   * anon_security_definer_function_executable (handle_new_user, resolve_challenge_on_attempt)

-- Recreate views with security_invoker = true.
DROP VIEW IF EXISTS public.best_level_scores;
CREATE VIEW public.best_level_scores
WITH (security_invoker = true) AS
SELECT DISTINCT ON (user_id, level_id)
  id, user_id, level_id, puzzle_seed,
  score, time_ms, mistakes, hints, stars, crown, move_count, completed_at
FROM public.level_scores
ORDER BY user_id, level_id, score DESC, time_ms ASC, completed_at ASC;

DROP VIEW IF EXISTS public.best_time_trial_scores;
CREATE VIEW public.best_time_trial_scores
WITH (security_invoker = true) AS
SELECT DISTINCT ON (user_id, mode, period_key)
  id, user_id, mode, period_key,
  score, time_ms, mistakes, hints, puzzle_seed, completed_at
FROM public.time_trial_scores
ORDER BY user_id, mode, period_key, score DESC, time_ms ASC, completed_at ASC;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_username_normalized()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username_normalized = NULL;
  ELSE
    NEW.username_normalized = lower(btrim(NEW.username));
    IF NEW.username_normalized !~ '^[a-z0-9_]{3,20}$' THEN
      RAISE EXCEPTION 'Invalid username "%": must be 3-20 chars, lowercase a-z 0-9 _', NEW.username;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger-only SECURITY DEFINER functions are not meant to be RPC-callable.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.resolve_challenge_on_attempt() FROM anon, authenticated, public;

-- Public buckets serve URLs via the CDN without RLS; remove the broad SELECT
-- policy that was only enabling object enumeration.
DROP POLICY IF EXISTS storage_avatars_select_public ON storage.objects;
