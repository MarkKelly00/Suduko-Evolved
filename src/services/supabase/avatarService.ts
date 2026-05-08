/**
 * Avatar upload to Supabase Storage. Path convention:
 *   avatars/<user_id>/<timestamp>.jpg
 *
 * Public bucket — the returned URL is the public CDN URL.
 *
 * IMPLEMENTATION NOTE: this is the canonical Supabase + React Native
 * upload pattern: read the file as base64 via expo-file-system, decode
 * to a Uint8Array, then hand it to supabase-js's storage client. The
 * supabase-js path manages both the `apikey` and `Authorization` headers
 * from the active session, so RLS sees a populated `auth.uid()`.
 *
 * Why not the previous approaches:
 *   - `Blob` from `fetch(file://...)` works locally but supabase-js's
 *     multipart serialisation drops the auth header on RN, so the
 *     storage layer treats the request as anon and the
 *     foldername-matches-uid policy rejects.
 *   - Manual `expo-file-system.uploadAsync` does include both headers,
 *     but iOS sometimes lowercases / coalesces them and the request
 *     reaches the storage layer without the auth context. We had to
 *     experiment our way to the working combination; this path is the
 *     well-trodden one in the Supabase RN starter.
 */

import { decode as base64ToBytes } from './utils/base64';
import { getSupabase } from './supabaseClient';

const BUCKET = 'avatars';

export interface UploadAvatarResult {
  path: string;
  url: string;
}

interface FileSystemModule {
  readAsStringAsync(
    uri: string,
    options?: { encoding?: 'base64' | 'utf8' },
  ): Promise<string>;
  EncodingType: { Base64: 'base64'; UTF8: 'utf8' };
}

function loadFileSystem(): FileSystemModule | null {
  try {
    // expo-file-system v18+ split the legacy path; both work for reads.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const legacy = require('expo-file-system/legacy') as Partial<FileSystemModule>;
    if (legacy?.readAsStringAsync && legacy.EncodingType) {
      return legacy as FileSystemModule;
    }
  } catch {
    // legacy path may not exist on older SDKs — fall through.
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-file-system') as Partial<FileSystemModule>;
    if (mod?.readAsStringAsync && mod.EncodingType) {
      return mod as FileSystemModule;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Uploads a local file URI to the avatars bucket.
 *
 * Implementation: file URI → base64 (expo-file-system) → Uint8Array →
 * supabase-js storage upload.
 */
export async function uploadAvatarFromUri(
  userId: string,
  fileUri: string,
  mime: string,
): Promise<UploadAvatarResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const FileSystem = loadFileSystem();
  if (!FileSystem) throw new Error('expo-file-system is unavailable');

  // Confirm the supabase client has a session — bail with a clear message
  // before we waste bytes if the user got signed out.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('Not signed in');

  // Cross-check: the path's first segment is `userId`, and the storage
  // RLS policy demands it equal `auth.uid()`. If the caller passed a
  // stale id (e.g. from a previous session) the upload would fail with
  // a confusing RLS error — surface a clear one instead.
  if (sessionData.session.user.id !== userId) {
    throw new Error(
      'Profile id is out of sync with the session. Sign out and sign back in.',
    );
  }

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  // Read as base64 → decode into bytes. Both expo-file-system v18+
  // (`File`) and the legacy import expose readAsStringAsync.
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(base64);

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: true,
    cacheControl: '3600',
  });
  if (error) {
    throw new Error(`Avatar upload failed: ${error.message}`);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;
  const fullPath = `${BUCKET}/${path}`;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_path: fullPath, avatar_url: url })
    .eq('id', userId);
  if (updateError) {
    throw new Error(`Avatar uploaded but profile update failed: ${updateError.message}`);
  }

  return { path: fullPath, url };
}

/**
 * Legacy entry point retained so callers that already have a body in
 * memory don't break the build. The crop screen now passes the file URI
 * directly via uploadAvatarFromUri — this overload is dead code.
 */
export async function uploadAvatar(
  userId: string,
  data: ArrayBuffer | Uint8Array | Blob,
  mime: string,
): Promise<UploadAvatarResult> {
  void data;
  void mime;
  void userId;
  throw new Error(
    'avatarService.uploadAvatar(blob) is deprecated. Use uploadAvatarFromUri(userId, fileUri, mime) instead.',
  );
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
