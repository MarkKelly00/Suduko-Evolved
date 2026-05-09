-- 008_public_duel_preview.sql
--
-- Public read-only preview RPC for the marketing/landing page at
-- https://sudokuevolved.com/duel/<inviteCode>.
--
-- Rationale:
--   The existing redeem_duel_invite() RPC creates a duel room and consumes
--   the invite — calling it from the website would silently accept the
--   invite before the user opens the iOS app. We need a non-mutating RPC
--   that returns ONLY safe public-display fields so the website can render
--   challenger handle / mode / expiry without redeeming.
--
-- Privacy:
--   - No opponent_id, challenger_id, room_id, puzzle_seed, tokens, or emails.
--   - Returns NULL challenger fields when the challenger profile is private
--     or soft-deleted.
--
-- Safety:
--   SECURITY DEFINER + revoked-from-public + explicit anon/authenticated
--   grants. search_path is locked to public to prevent shadowing attacks.

create or replace function public.preview_duel_invite_public(p_invite_code text)
returns table (
  invite_code text,
  status text,
  mode text,
  expires_at timestamptz,
  created_at timestamptz,
  challenger_username text,
  challenger_display_name text,
  challenger_avatar_url text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    di.invite_code,
    di.status,
    di.mode,
    di.expires_at,
    di.created_at,
    case
      when p.privacy_level = 'private' or p.deleted_at is not null then null
      else p.username
    end as challenger_username,
    case
      when p.privacy_level = 'private' or p.deleted_at is not null then null
      else p.display_name
    end as challenger_display_name,
    case
      when p.privacy_level = 'private' or p.deleted_at is not null then null
      else p.avatar_url
    end as challenger_avatar_url
  from duel_invites di
  left join profiles p on p.id = di.challenger_id
  where di.invite_code = p_invite_code
  limit 1
$$;

revoke all on function public.preview_duel_invite_public(text) from public;
grant execute on function public.preview_duel_invite_public(text) to anon, authenticated;

comment on function public.preview_duel_invite_public(text) is
  'Public, read-only preview of a duel invite for the marketing site. Returns only safe fields. Does NOT mutate state. The iOS app continues to use redeem_duel_invite() for accept-and-join.';
