/**
 * notificationRouter — translates a notification's `data` payload
 * into a `navigationRef.navigate(...)` call when the user taps it.
 *
 * The payload shape is set server-side in the SQL trigger functions
 * (see `db/004_notification_triggers.sql` or the Supabase MCP migration
 * `push_notification_triggers`). Every payload includes a `route` key
 * naming a top-level RootStack screen, plus per-route params.
 *
 * Recognised payloads:
 *
 *   { route: 'Friends', tab: 'challenges' | 'requests' }
 *   { route: 'FriendProfile', user_id }
 *   { route: 'DuelLobby', room_id, puzzle_seed, mode }
 *   { route: 'Leaderboard', mode, level_id, scope }
 *
 * If a payload doesn't match any recognised shape, we navigate to
 * Friends (a sensible "you got social activity" home) rather than
 * crashing or dropping the tap.
 */

import { navigationRef, navigateSafe } from '@/app/navigation/navigationRef';
import type { FriendsTab } from '@/app/navigation/routes';

interface NotificationPayload {
  route?: string;
  tab?: string;
  user_id?: string;
  room_id?: string;
  puzzle_seed?: string;
  mode?: string;
  level_id?: string;
  scope?: string;
  // additional fields are silently ignored
  [k: string]: unknown;
}

const VALID_FRIENDS_TABS: ReadonlySet<FriendsTab> = new Set([
  'friends',
  'requests',
  'add',
  'challenges',
]);

export function handleNotificationTap(
  rawData: Record<string, unknown> | undefined | null,
): void {
  if (!rawData) return;
  const data = rawData as NotificationPayload;
  if (!navigationRef.isReady()) {
    // Defer until container is ready. Add a single retry; if it's still
    // not ready 500ms later, drop the tap.
    setTimeout(() => {
      if (navigationRef.isReady()) handleNotificationTap(data);
    }, 500);
    return;
  }

  switch (data.route) {
    case 'Friends': {
      const tab = data.tab as FriendsTab | undefined;
      navigateSafe(
        'Friends',
        tab && VALID_FRIENDS_TABS.has(tab) ? { initialTab: tab } : undefined,
      );
      return;
    }
    case 'FriendProfile': {
      if (typeof data.user_id !== 'string') break;
      navigateSafe('FriendProfile', { userId: data.user_id });
      return;
    }
    case 'DuelLobby': {
      if (
        typeof data.room_id !== 'string' ||
        typeof data.puzzle_seed !== 'string' ||
        typeof data.mode !== 'string'
      ) {
        break;
      }
      navigateSafe('DuelLobby', {
        roomId: data.room_id,
        puzzleSeed: data.puzzle_seed,
        mode: data.mode,
        // The lobby reads start_at from the room itself; an empty string
        // is fine here since DuelLobbyScreen ignores the navigation
        // param and uses mark_duel_ready's response instead.
        startAt: '',
      });
      return;
    }
    case 'Leaderboard': {
      navigateSafe('Leaderboard', {
        mode: data.mode === 'time-trial' ? 'time-trial' : 'campaign-level',
        levelId: typeof data.level_id === 'string' ? data.level_id : undefined,
        scope: data.scope === 'friends' ? 'friends' : 'global',
      });
      return;
    }
    default:
      break;
  }

  // Fallback: open Friends. Better than dropping the tap silently.
  navigateSafe('Friends', undefined);
}
