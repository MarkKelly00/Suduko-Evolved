/**
 * Mint a duel invite link via Supabase and open the system Share sheet.
 *
 * Centralises the failure-visibility policy across every "Share invite link"
 * surface (TimeTrialScreen, FriendDuelPickerScreen, MatchmakingScreen). Each
 * site previously had an empty `catch` block that silently swallowed every
 * failure mode — RPC errors, network timeouts, Share API crashes — leaving
 * the user looking at a button that did nothing. Now:
 *
 *   - RPC / network failures → Alert.alert with the error message + dev log
 *   - Share-sheet failures   → Alert.alert with a generic message + dev log
 *   - User cancels Share     → silent (Share.dismissedAction is normal UX)
 *
 * Returns `true` on a completed share, `false` otherwise (cancel or error).
 */
import { Alert, Share } from 'react-native';
import { createDuelLink } from './duelInviteService';

/**
 * Pull a user-readable message off whatever was thrown. Native `Error`
 * instances expose `.message` directly, but Supabase SDK errors are POJOs
 * shaped `{ message, details, hint, code }` — checking only `instanceof
 * Error` masked their messages as "Something went wrong" the first time
 * the RPC failed with `function gen_random_bytes does not exist`. This
 * helper surfaces both shapes (and falls back to a generic line if the
 * thrown value really has nothing useful).
 */
function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const obj = err as { message?: unknown; hint?: unknown; details?: unknown };
    if (typeof obj.message === 'string' && obj.message.length > 0) {
      return obj.message;
    }
    if (typeof obj.hint === 'string' && obj.hint.length > 0) return obj.hint;
    if (typeof obj.details === 'string' && obj.details.length > 0) {
      return obj.details;
    }
  }
  return fallback;
}

interface ShareDuelInviteOptions {
  /** Called after a completed share (NOT after cancel or error). */
  onSuccess?: () => void;
}

export async function shareDuelInviteLink(
  mode: string,
  opts: ShareDuelInviteOptions = {},
): Promise<boolean> {
  // ─── 1. Mint the invite link ─────────────────────────────────────────────
  let link;
  try {
    link = await createDuelLink(mode);
  } catch (err) {
    if (__DEV__) {
      console.warn('[shareDuelInviteLink] createDuelLink failed:', err);
    }
    Alert.alert(
      "Couldn't create invite link",
      describeError(err, 'Something went wrong. Please try again.'),
    );
    return false;
  }

  // ─── 2. Open the system Share sheet ──────────────────────────────────────
  try {
    const result = await Share.share({
      message: `Race me on Sudoku Evolved — ${link.shareUrl}`,
      url: link.shareUrl,
    });
    if (result.action === Share.dismissedAction) {
      // User cancelled — that's a normal UX path, not a failure. No toast.
      return false;
    }
    opts.onSuccess?.();
    return true;
  } catch (err) {
    if (__DEV__) {
      console.warn('[shareDuelInviteLink] Share.share failed:', err);
    }
    Alert.alert(
      'Could not open the share sheet',
      describeError(err, 'The share sheet failed to open.'),
    );
    return false;
  }
}
