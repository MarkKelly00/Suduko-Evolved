/**
 * Haptics service. Wraps `expo-haptics` for Phase 3 / 4 with graceful
 * fallbacks. Will be replaced by a native Core Haptics module later for
 * richer iOS-only patterns (combo riffs, full-puzzle Logic Bloom).
 *
 * Respects `useSettingsStore.hapticsEnabled` and `reducedMotion`. All methods
 * are async-safe but never throw — failures are swallowed so a missing
 * native module on a stripped build never breaks gameplay.
 */
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/game/state/useSettingsStore';

function shouldFire(): boolean {
  const s = useSettingsStore.getState();
  if (!s.hapticsEnabled) return false;
  // We still allow gentle haptics under reduced-motion since the spec calls
  // out reducedMotion as a *visual* preference, but caller can override by
  // checking explicitly before invoking heavier patterns.
  return true;
}

function safe(fn: () => Promise<unknown>): void {
  if (!shouldFire()) return;
  fn().catch(() => {
    // Swallow — haptics are non-essential.
  });
}

export const hapticsService = {
  light(): void {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  medium(): void {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  heavy(): void {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  warning(): void {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  success(): void {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  selection(): void {
    safe(() => Haptics.selectionAsync());
  },
  /** Two quick taps — placeholder for future Core Haptics combo pattern. */
  combo(): void {
    if (!shouldFire()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 90);
  },
  /** Triple celebratory pulse — placeholder until native Core Haptics. */
  puzzleComplete(): void {
    if (!shouldFire()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 140);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, 280);
  },
};
