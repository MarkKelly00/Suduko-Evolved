/**
 * Root navigation ref.
 *
 * Use this instead of `useNavigation()` from components that live outside
 * the Navigator's Screen tree (e.g. global banner overlays mounted as
 * siblings of `<RootNavigator />` inside `<NavigationContainer>`). Hooks
 * like `useNavigation` / `useNavigationState` are documented for use
 * *inside* a Screen — calling them as a NavigationContainer child can
 * crash on initial mount when the container's state hasn't hydrated yet,
 * which surfaces as a launch SIGABRT in production builds via
 * RCTExceptionsManager.
 *
 * Pattern:
 *   1. <NavigationContainer ref={navigationRef} ...>
 *   2. `navigationRef.isReady()` before any `.navigate(...)` call.
 *   3. Subscribe to route changes with `navigationRef.addListener('state', ...)`
 *      via `useEffect`.
 *
 * See: https://reactnavigation.org/docs/navigation-container/#ref
 */
import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './routes';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Returns the currently focused route name, or null if navigation isn't
 *  ready yet (initial render or between transitions). Defensive against
 *  malformed state during NavigationContainer hydration. */
export function getActiveRouteName(): string | null {
  if (!navigationRef.isReady()) return null;
  try {
    const route = navigationRef.getCurrentRoute();
    return route?.name ?? null;
  } catch {
    return null;
  }
}

/** Safely navigate. No-op if the container isn't ready yet. */
export function navigateSafe<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  ...params: RootStackParamList[RouteName] extends undefined
    ? [undefined?]
    : [RootStackParamList[RouteName]]
): void {
  if (!navigationRef.isReady()) return;
  // The any cast is unavoidable due to the conditional param tuple.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (navigationRef.navigate as any)(name, ...params);
}
