/**
 * Avatar upload to Supabase Storage. Path convention:
 *   avatars/<user_id>/<timestamp>.jpg
 *
 * Public bucket — the returned URL is the public CDN URL.
 */

import { getSupabase } from './supabaseClient';

const BUCKET = 'avatars';

export interface UploadAvatarResult {
  path: string;
  url: string;
}

export async function uploadAvatar(
  userId: string,
  data: ArrayBuffer | Uint8Array | Blob,
  mime: string,
): Promise<UploadAvatarResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  // Cast away the strict supabase-js Body type since RN platforms accept the
  // shapes we pass (ArrayBuffer / Uint8Array via fetch+blob, or a Blob).
  const body = data as unknown as Blob;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: mime,
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw error;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  // Persist to profile so other clients see the new avatar.
  const fullPath = `${BUCKET}/${path}`;
  await supabase
    .from('profiles')
    .update({ avatar_path: fullPath, avatar_url: url })
    .eq('id', userId);

  return { path: fullPath, url };
}

export async function deleteAvatar(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('id', userId)
    .maybeSingle();
  const avatarPath = (profile as { avatar_path: string | null } | null)?.avatar_path;
  if (avatarPath) {
    const objectPath = avatarPath.startsWith(`${BUCKET}/`)
      ? avatarPath.slice(BUCKET.length + 1)
      : avatarPath;
    await supabase.storage.from(BUCKET).remove([objectPath]);
  }
  await supabase
    .from('profiles')
    .update({ avatar_path: null, avatar_url: null })
    .eq('id', userId);
}

export function getAvatarPublicUrl(path: string): string {
  const supabase = getSupabase();
  if (!supabase) return '';
  const objectPath = path.startsWith(`${BUCKET}/`) ? path.slice(BUCKET.length + 1) : path;
  return supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}
