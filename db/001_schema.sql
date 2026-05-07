-- Sudoku Evolved — core schema
-- Tables, triggers, and helper functions for the social layer.
-- Apply order: 001_schema → 002_indexes → 003_policies → 004_views → 005_storage

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username                 text UNIQUE,
  username_normalized      text UNIQUE,
  display_name             text,
  avatar_path              text,
  avatar_url               text,
  xp                       integer NOT NULL DEFAULT 0,
  streak                   integer NOT NULL DEFAULT 0,
  levels_cleared           integer NOT NULL DEFAULT 0,
  stars_total              integer NOT NULL DEFAULT 0,
  crowns_total             integer NOT NULL DEFAULT 0,
  best_time_trial_score    integer NOT NULL DEFAULT 0,
  privacy_level            text    NOT NULL DEFAULT 'public'
                                   CHECK (privacy_level IN ('public', 'friends', 'private')),
  deleted_at               timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- friendships
-- Symmetric pair stored once. Status transitions:
--   pending  -> accepted | declined
--   accepted -> (no further transition; remove via DELETE)
--   declined -> deletable
--   blocked  -> blocker can unblock via DELETE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        text NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)
);

-- ============================================================
-- level_scores (immutable per-attempt history)
-- level_id stored as text to match existing app conventions
-- (e.g. 'world1-level-01').
-- ============================================================
CREATE TABLE IF NOT EXISTS public.level_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id      text NOT NULL,
  puzzle_seed   text NOT NULL,
  score         integer NOT NULL CHECK (score >= 0),
  time_ms       integer NOT NULL CHECK (time_ms >= 0),
  mistakes      integer NOT NULL CHECK (mistakes >= 0),
  hints         integer NOT NULL CHECK (hints >= 0),
  stars         integer NOT NULL CHECK (stars BETWEEN 1 AND 3),
  crown         boolean NOT NULL DEFAULT false,
  move_count    integer,
  completed_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- time_trial_scores
-- mode: 'sprint-3min' | 'daily-sprint' | future modes
-- period_key: '' for all-time aggregation; 'YYYY-MM-DD' for daily,
--             'YYYY-Www' for weekly buckets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.time_trial_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode          text NOT NULL,
  period_key    text NOT NULL DEFAULT '',
  score         integer NOT NULL CHECK (score >= 0),
  time_ms       integer CHECK (time_ms IS NULL OR time_ms >= 0),
  mistakes      integer CHECK (mistakes IS NULL OR mistakes >= 0),
  hints         integer CHECK (hints IS NULL OR hints >= 0),
  puzzle_seed   text,
  completed_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- challenges
-- mode: 'campaign' | 'sprint'
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id              uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode                     text NOT NULL CHECK (mode IN ('campaign', 'sprint')),
  level_id                 text,
  sprint_mode_id           text,
  puzzle_seed              text NOT NULL,
  status                   text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'accepted', 'completed', 'expired', 'declined')),
  challenger_attempt_id    uuid,
  opponent_attempt_id      uuid,
  winner_id                uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at               timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at               timestamptz NOT NULL DEFAULT now(),
  completed_at             timestamptz,
  CONSTRAINT challenges_no_self CHECK (challenger_id <> opponent_id)
);

-- ============================================================
-- challenge_attempts
-- One row per (challenge, user). The single-row UNIQUE makes
-- "submit your attempt" idempotent on the client.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenge_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score         integer NOT NULL CHECK (score >= 0),
  time_ms       integer NOT NULL CHECK (time_ms >= 0),
  mistakes      integer NOT NULL CHECK (mistakes >= 0),
  hints         integer NOT NULL CHECK (hints >= 0),
  stars         integer CHECK (stars IS NULL OR (stars BETWEEN 1 AND 3)),
  crown         boolean,
  move_count    integer,
  completed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

-- ============================================================
-- helpers: timestamps + username normalization
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_username_normalized()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username_normalized = NULL;
  ELSE
    -- Lowercase + trim. NFKC normalization happens client-side.
    NEW.username_normalized = lower(btrim(NEW.username));
    -- Length + charset enforcement (defense-in-depth).
    IF NEW.username_normalized !~ '^[a-z0-9_]{3,20}$' THEN
      RAISE EXCEPTION 'Invalid username "%": must be 3-20 chars, lowercase a-z 0-9 _', NEW.username;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_enforce_username_normalized ON public.profiles;
CREATE TRIGGER profiles_enforce_username_normalized
BEFORE INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_username_normalized();

DROP TRIGGER IF EXISTS friendships_set_updated_at ON public.friendships;
CREATE TRIGGER friendships_set_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- handle_new_user — auto-seed a profiles row on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
