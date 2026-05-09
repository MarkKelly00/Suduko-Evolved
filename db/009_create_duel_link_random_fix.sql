-- 009_create_duel_link_random_fix.sql
--
-- Bug: the original create_duel_link RPC (introduced earlier in the duel
-- pipeline, not in db/) generated invite codes via gen_random_bytes(8),
-- which lives in the pgcrypto extension. pgcrypto wasn't installed on
-- this project, so every authenticated invocation failed at runtime with:
--
--    ERROR: function gen_random_bytes(integer) does not exist
--
-- The client surfaced this as "Couldn't create invite link / Something
-- went wrong" via the Alert in shareDuelInviteLink — and zero rows ever
-- landed in duel_invites despite the iOS UI reaching the RPC.
--
-- Fix: switch to gen_random_uuid() (always available, no extension)
-- and base64url-encode its raw bytes for a 12-char URL-safe code.
-- Same security profile as 16 random bytes; nicer share URL.

CREATE OR REPLACE FUNCTION public.create_duel_link(p_mode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_invite_code text;
  v_invite_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_invite_code := translate(
    encode(uuid_send(gen_random_uuid()), 'base64'),
    '+/=',
    '-_x'
  );
  v_invite_code := substr(v_invite_code, 1, 12);

  INSERT INTO public.duel_invites
    (invite_code, challenger_id, mode, puzzle_seed, status, max_uses)
  VALUES
    (v_invite_code, v_user_id, p_mode, 'pending', 'pending', 1)
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'invite_id', v_invite_id,
    'invite_code', v_invite_code,
    'mode', p_mode,
    'share_url', 'https://sudokuevolved.com/duel/' || v_invite_code,
    'expires_at', (now() + interval '24 hours')
  );
END;
$function$;
