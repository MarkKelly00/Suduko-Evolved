import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { selectLastEvents, useGameStore } from '@/game/state/useGameStore';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { colors, duration, easing, fontSize, fontWeight } from '@/theme';
import { hapticsService } from '@/services/haptics/hapticsService';
import { audioService } from '@/services/audio/audioService';

/**
 * Phase 3 placeholder overlay. When the engine emits completion events
 * (row / col / box / numberSet / puzzle), we briefly flash a labeled chip
 * over the board and fire the corresponding haptic + SFX.
 *
 * Phase 4 replaces this with a Skia `<Canvas>` overlay (sweeps, beams,
 * particle bursts). The triggering logic and event shape stay the same so
 * the upgrade is a drop-in.
 */
export function CompletionOverlay() {
  const events = useGameStore(selectLastEvents);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const clearLastEvents = useGameStore((s) => s.clearLastEvents);

  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (events.length === 0) return;
    // Fire feedback per event in stable engine order.
    for (const ev of events) {
      switch (ev.type) {
        case 'row':
          audioService.playRowComplete();
          hapticsService.medium();
          break;
        case 'col':
          audioService.playColumnComplete();
          hapticsService.medium();
          break;
        case 'box':
          audioService.playBoxComplete();
          hapticsService.heavy();
          break;
        case 'numberSet':
          audioService.playNumberSetComplete();
          hapticsService.medium();
          break;
        case 'puzzle':
          audioService.playPuzzleComplete();
          hapticsService.puzzleComplete();
          break;
      }
    }
    if (events.filter((e) => e.type !== 'puzzle').length >= 2) {
      audioService.playCombo();
      hapticsService.combo();
    }
    if (reducedMotion) {
      // Still register the toast briefly so user sees the achievement.
      opacity.value = withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(0, { duration: duration.slow, easing: easing.standard }),
      );
    } else {
      opacity.value = withSequence(
        withTiming(1, { duration: duration.fast, easing: easing.entrance }),
        withTiming(0, { duration: duration.cinematic, easing: easing.exit }),
      );
    }
    const t = setTimeout(() => clearLastEvents(), duration.cinematic + duration.fast);
    return () => clearTimeout(t);
  }, [events, opacity, reducedMotion, clearLastEvents]);

  if (events.length === 0) return null;

  const label = labelForEvents(events);

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View style={[styles.chip, animatedStyle]}>
        <Text style={styles.chipText}>{label}</Text>
      </Animated.View>
    </View>
  );
}

function labelForEvents(events: readonly { type: string; index?: number; value?: number }[]): string {
  const nonPuzzle = events.filter((e) => e.type !== 'puzzle');
  if (events.some((e) => e.type === 'puzzle')) return 'Logic Bloom';
  if (nonPuzzle.length >= 4) return 'Perfect Harmony';
  if (nonPuzzle.length === 3) return 'Logic Cascade';
  if (nonPuzzle.length === 2) return 'Triple Flow';
  const first = events[0];
  if (!first) return '';
  switch (first.type) {
    case 'row':
      return 'Row Complete';
    case 'col':
      return 'Column Complete';
    case 'box':
      return 'Box Burst';
    case 'numberSet':
      return `${first.value ?? ''} Cleared`;
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentGold,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.accentGoldGlow,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
});
