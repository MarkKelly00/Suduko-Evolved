/**
 * justInTimePrompt — fires the system push-permission prompt at
 * moments where the user has just done something that would yield
 * notifications (sent an invite link, sent a challenge, sent a friend
 * request). This is the recommended pattern per Apple HIG: ask in
 * context, not at cold start.
 *
 * iOS only ever shows the system prompt ONCE per install. Subsequent
 * calls fall through silently. We persist the "asked" flag in MMKV
 * (via pushService.hasBeenAskedForPermission) so we don't trigger
 * even the no-op path on every send.
 *
 * After the prompt, if the user accepted, we kick off
 * `registerForPushNotifications()` so they're immediately set up to
 * receive pings without waiting for the next cold start.
 */

import {
  hasBeenAskedForPermission,
  requestPermissionsAsync,
  registerForPushNotifications,
} from './pushService';
import { useSettingsStore } from '@/game/state/useSettingsStore';

/**
 * Try to prompt for push permission. Guarantees:
 *   - Only ever runs ONCE per install (first qualifying call wins).
 *   - Honours the master `notificationPrefs.enabled` setting — if the
 *     user has explicitly opted out in Settings, never auto-prompts.
 *   - Fire-and-forget from the caller's perspective.
 *
 * Returns a promise so callers can await it if they want sequencing,
 * but no caller is required to.
 */
export async function maybePromptForPush(_reason: string): Promise<void> {
  // Reason is currently logged only in __DEV__ for debugging; future
  // versions could pass it to a contextual modal explaining WHY we're
  // asking.
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[justInTimePrompt]', _reason);
  }

  if (hasBeenAskedForPermission()) return;

  const prefs = useSettingsStore.getState().notificationPrefs;
  if (prefs && prefs.enabled === false) return;

  const result = await requestPermissionsAsync();
  if (result.granted) {
    void registerForPushNotifications();
  }
}
