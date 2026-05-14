/**
 * pushService — single entry point for everything `expo-notifications`.
 *
 * Lifecycle:
 *   - `configureForegroundHandler()` is called once at app startup so
 *     OS-level banners don't double-up with our in-app gold banners
 *     (when one of those is already on screen, we suppress the OS one).
 *   - `registerForPushNotifications()` is called after auth completes.
 *     It is idempotent: checks current permission, fetches the Expo
 *     push token, and upserts it into `push_tokens` for the local user.
 *     No-op on web / simulator / Android without an FCM project.
 *   - `requestPermissionsAsync()` triggers the system permission prompt.
 *     Should only be called from one of the just-in-time sites (first
 *     invite, first challenge, first friend request) OR from Settings.
 *
 * The "asked before?" flag is persisted via the existing MMKV storage
 * shim so we never re-prompt after the user denied once (iOS only lets
 * you ask once; subsequent calls silently return the existing status).
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { getStorage } from '@/services/persistence/storage';
import { getSupabase } from '@/services/supabase/supabaseClient';
import { useDuelInviteStore } from '@/game/state/useDuelInviteStore';
import { useChallengeReceivedStore } from '@/game/state/useChallengeReceivedStore';

const PERM_ASKED_KEY = 'push.permission.asked.v1';
const REGISTERED_TOKEN_KEY = 'push.token.registered.v1';

let foregroundHandlerInstalled = false;
let inFlightRegistration: Promise<void> | null = null;

/** Project ID needed for getExpoPushTokenAsync in EAS-built apps. */
const PROJECT_ID = '32744194-c3ce-4efb-b472-d5dad1ea8e52';

/**
 * Tell the OS what to do when a push arrives while the app is in the
 * foreground. We suppress the OS banner only when one of our own
 * in-app gold banners is already on screen for the same event — those
 * cover the foreground UX. Otherwise we show the OS banner (player
 * may be on a different screen and we still want to surface the alert).
 */
export function configureForegroundHandler(): void {
  if (foregroundHandlerInstalled) return;
  foregroundHandlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const inviteBannerActive = useDuelInviteStore.getState().acceptance != null;
      const challengeBannerActive =
        useChallengeReceivedStore.getState().notification != null;
      const suppress = inviteBannerActive || challengeBannerActive;
      return {
        shouldShowBanner: !suppress,
        shouldShowList: !suppress,
        shouldPlaySound: !suppress,
        shouldSetBadge: false,
      };
    },
  });
}

/** Has the user already been asked for permission (regardless of answer)? */
export function hasBeenAskedForPermission(): boolean {
  try {
    return getStorage().get<boolean>(PERM_ASKED_KEY, false) === true;
  } catch {
    return false;
  }
}

function markAsked(): void {
  try {
    getStorage().set<boolean>(PERM_ASKED_KEY, true);
  } catch {
    // ignore
  }
}

export interface PermissionResult {
  granted: boolean;
  /** True iff the system prompt was just shown — false on subsequent
   *  calls (iOS doesn't re-prompt after the first answer). */
  prompted: boolean;
  status: Notifications.PermissionStatus;
}

/**
 * Request system notification permission. Returns the current status
 * along with whether the OS prompt was shown.
 *
 * iOS rules:
 *   - The system prompt is only ever displayed ONCE per install. After
 *     that, this call simply returns the recorded status.
 *   - Subsequent enables happen in iOS Settings (we surface a deep
 *     link in the in-app Settings screen for that).
 */
export async function requestPermissionsAsync(): Promise<PermissionResult> {
  if (Platform.OS === 'web') {
    return { granted: false, prompted: false, status: 'denied' as Notifications.PermissionStatus };
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') {
    markAsked();
    return { granted: true, prompted: false, status: existing.status };
  }
  if (existing.status === 'denied' && hasBeenAskedForPermission()) {
    // Already denied — iOS won't re-prompt. Caller should surface a
    // "open iOS Settings" affordance.
    return { granted: false, prompted: false, status: existing.status };
  }
  const result = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
      allowAnnouncements: false,
    },
  });
  markAsked();
  return {
    granted: result.status === 'granted',
    prompted: true,
    status: result.status,
  };
}

/**
 * Register the device with Expo Push, then upsert the token into the
 * `push_tokens` table for the currently-signed-in user. Idempotent;
 * concurrent calls dedupe via `inFlightRegistration`.
 *
 * No-ops:
 *   - On a simulator (Expo can't issue push tokens for simulators).
 *   - When permission is not granted.
 *   - When the user has no Supabase session (guest play).
 */
export async function registerForPushNotifications(): Promise<void> {
  if (inFlightRegistration) return inFlightRegistration;
  inFlightRegistration = (async () => {
    try {
      if (!Device.isDevice) return; // sim / web — skip silently
      const perm = await Notifications.getPermissionsAsync();
      if (perm.status !== 'granted') return;
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) return;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: PROJECT_ID,
      });
      const expoPushToken = tokenData.data;
      if (!expoPushToken) return;

      // Skip re-upsert when we've already registered this exact token —
      // saves a round-trip on warm starts. The storage flag is reset
      // automatically on signOut via auth bootstrap.
      const lastRegistered = getStorage().get<string>(REGISTERED_TOKEN_KEY, '');
      if (lastRegistered === expoPushToken) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { error } = await client.rpc('upsert_push_token', {
        p_expo_push_token: expoPushToken,
        p_platform: Platform.OS,
        p_device_id: null,
      });
      if (error) {
        if (__DEV__) console.warn('[pushService.register] upsert failed:', error.message);
        return;
      }
      getStorage().set<string>(REGISTERED_TOKEN_KEY, expoPushToken);
    } catch (err) {
      if (__DEV__) console.warn('[pushService.register] threw:', err);
    } finally {
      inFlightRegistration = null;
    }
  })();
  return inFlightRegistration;
}

/** Clear the cached token registration flag — call on sign-out so the
 *  next signed-in user re-registers with their own user_id. */
export function clearRegisteredTokenCache(): void {
  try {
    getStorage().remove(REGISTERED_TOKEN_KEY);
  } catch {
    // ignore
  }
}
