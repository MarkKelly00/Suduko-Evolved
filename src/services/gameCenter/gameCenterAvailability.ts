/**
 * Cheap availability checks. Every public service method gates on
 * `isPlatformIOS()` first so the entire layer is a typed no-op on
 * Android, web, or any non-iOS host. Module presence is checked
 * separately because a misconfigured iOS build (pod missing, native
 * code stripped, dev build of an older commit, etc.) should also
 * short-circuit cleanly without throwing.
 */

import { Platform } from 'react-native';
import { getNativeGameCenter } from 'expo-game-center';

export function isPlatformIOS(): boolean {
  return Platform.OS === 'ios';
}

/**
 * True when the native Swift module is loaded and reachable. False on
 * Android (correct, by design), or on iOS when the pod failed to
 * compile / link.
 */
export function isNativeModuleLoaded(): boolean {
  if (!isPlatformIOS()) return false;
  return getNativeGameCenter() !== null;
}

/** Convenience: combined platform + module check. */
export function isAvailableSync(): boolean {
  return isNativeModuleLoaded();
}
