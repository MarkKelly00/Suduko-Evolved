import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StarRating } from '@/components/ui/StarRating';
import {
  colors,
  duration,
  easing,
  fontSize,
  fontWeight,
  shadows,
} from '@/theme';
import { hapticsService } from '@/services/haptics/hapticsService';
import { useSettingsStore } from '@/game/state/useSettingsStore';

export type LevelNodeState = 'locked' | 'unlocked' | 'current' | 'completed';

interface Props {
  index: number;
  state: LevelNodeState;
  stars?: 0 | 1 | 2 | 3;
  crown?: boolean;
  onPress: () => void;
  size?: number;
  /** Set true for ~1.5 s after a level transitions from locked → unlocked
   *  so the node fires a one-shot Logic Bloom celebration. */
  isNewlyUnlocked?: boolean;
  /** Optional override: marks the node as a milestone that earns extra
   *  visual weight (used near landmark levels). */
  variant?: 'default' | 'milestone';
  /** Optional per-world tint for the UNLOCKED (available, not-yet-played)
   *  state. World 2 passes its cosmic violet set; omitting it keeps the
   *  Logic Garden cyan exactly as before. Current (gold) + completed (green)
   *  stay universal across worlds. */
  unlockedAccent?: { border: string; glow: string; halo: string; text: string };
  /** Extra context appended to the VoiceOver label, e.g. "World 2, Starfall
   *  Archive". Yields "Level 42, World 2, Starfall Archive, unlocked, 2 stars". */
  accessibilityContext?: string;
}

/**
 * Premium 2.5D level node.
 *
 * Layered structure (back to front):
 *   1. Newly-unlocked bloom — short-lived expanding halo (only when
 *      `isNewlyUnlocked` flips true).
 *   2. Outer glow ring — colored shadow + low-opacity ring that sells
 *      the "this is alive" feel for current/completed nodes.
 *   3. Bevel disc — the visible body of the node, tinted per state.
 *   4. Top-left highlight — small offset disc with a soft white tint
 *      to fake top-light shading. Disabled for locked nodes.
 *   5. Bottom-right shadow — a thin dark crescent fakes underside form.
 *   6. Number text — sits dead center.
 *   7. Frost overlay — only on locked nodes, soft cool wash.
 *   8. Stars (existing component) — anchored below the node.
 */
export function LevelNode({
  index,
  state,
  stars = 0,
  crown = false,
  onPress,
  size = 64,
  isNewlyUnlocked = false,
  variant = 'default',
  unlockedAccent,
  accessibilityContext,
}: Props) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const highContrast = useSettingsStore((s) => s.highContrast);

  // Reanimated state ----------------------------------------------------
  const shakeX = useSharedValue(0);
  const breathing = useSharedValue(1);
  const bloomScale = useSharedValue(0);
  const bloomOpacity = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: breathing.value }],
  }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacity.value,
    transform: [{ scale: bloomScale.value }],
  }));

  // Breathing on the current node — calm in/out cycle. Disabled in
  // reduced-motion mode.
  useEffect(() => {
    if (state !== 'current' || reducedMotion) {
      breathing.value = 1;
      return undefined;
    }
    breathing.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(breathing);
  }, [state, reducedMotion, breathing]);

  // One-shot Logic Bloom on unlock.
  useEffect(() => {
    if (!isNewlyUnlocked) return;
    if (reducedMotion) {
      bloomOpacity.value = withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(0, { duration: 360, easing: Easing.linear }),
      );
      bloomScale.value = 1.4;
      return;
    }
    bloomScale.value = 0.3;
    bloomOpacity.value = 0;
    bloomScale.value = withTiming(1.8, {
      duration: 900,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    bloomOpacity.value = withSequence(
      withTiming(0.85, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) }),
    );
  }, [isNewlyUnlocked, reducedMotion, bloomScale, bloomOpacity]);

  const handlePress = () => {
    if (state === 'locked') {
      hapticsService.warning();
      shakeX.value = withSequence(
        withTiming(-6, { duration: duration.fast, easing: easing.standard }),
        withTiming(6, { duration: duration.fast, easing: easing.standard }),
        withTiming(0, { duration: duration.fast, easing: easing.standard }),
      );
      return;
    }
    hapticsService.selection();
    onPress();
  };

  const palette = paletteFor(state, highContrast, unlockedAccent);
  const isMilestone = variant === 'milestone';
  const milestoneScale = isMilestone ? 1.08 : 1;
  const total = size * milestoneScale;
  const half = total / 2;
  const ringSize = total + 18;
  const bloomSize = total * 2.2;

  return (
    <Animated.View style={[styles.outer, { width: ringSize + 24, height: ringSize + 24 }]}>
      {/* Bloom halo — sits behind everything; visible only on unlock. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.absolute,
          {
            width: bloomSize,
            height: bloomSize,
            borderRadius: bloomSize / 2,
            left: (ringSize + 24 - bloomSize) / 2,
            top: (ringSize + 24 - bloomSize) / 2,
            backgroundColor: palette.glow,
          },
          bloomStyle,
        ]}
      />

      {/* Outer halo ring — soft tinted background to make the node
          read as luminous. Drawn for unlocked/current/completed only.
          Locked nodes deliberately skip this so they look dormant. */}
      {state !== 'locked' ? (
        <View
          pointerEvents="none"
          style={[
            styles.absolute,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              left: (ringSize + 24 - ringSize) / 2,
              top: (ringSize + 24 - ringSize) / 2,
              backgroundColor: palette.haloBg,
              opacity: 0.45,
            },
          ]}
        />
      ) : null}

      <Animated.View style={[shakeStyle, { width: total, height: total }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={describe(index, state, stars, crown, accessibilityContext)}
          onPress={handlePress}
          style={({ pressed }) => [
            styles.bevel,
            {
              width: total,
              height: total,
              borderRadius: half,
              borderColor: palette.border,
              backgroundColor: palette.fill,
            },
            state === 'current' && (shadows.goldGlow as ViewStyle),
            state === 'completed' && (shadows.successGlow as ViewStyle),
            isMilestone && state !== 'locked' && styles.milestoneRing,
            pressed && styles.pressed,
          ]}
        >
          {/* Top-left highlight — small soft disc that fakes a light from
              the upper-left. Suppressed for locked nodes which are flat. */}
          {state !== 'locked' ? (
            <View
              pointerEvents="none"
              style={[
                styles.highlight,
                {
                  width: total * 0.55,
                  height: total * 0.55,
                  borderRadius: total * 0.55,
                  top: total * 0.08,
                  left: total * 0.08,
                  backgroundColor: palette.highlight,
                },
              ]}
            />
          ) : null}

          {/* Bottom-right inner shadow — thin curved overlay that fakes
              the underside of a 3D form. */}
          {state !== 'locked' ? (
            <View
              pointerEvents="none"
              style={[
                styles.shadow,
                {
                  width: total,
                  height: total,
                  borderRadius: half,
                  borderColor: palette.shadow,
                },
              ]}
            />
          ) : null}

          <Text style={[styles.indexText, { color: palette.text }]}>{index}</Text>

          {/* Frost overlay — only on locked nodes, soft cool wash to
              communicate "dormant". */}
          {state === 'locked' ? (
            <View
              pointerEvents="none"
              style={[
                styles.frost,
                {
                  width: total,
                  height: total,
                  borderRadius: half,
                  backgroundColor: colors.gardenNodeFrost,
                },
              ]}
            />
          ) : null}
        </Pressable>
      </Animated.View>

      <View style={styles.starWrap}>
        <StarRating stars={stars} size={12} crown={crown} showEmpty={state === 'completed'} />
      </View>
    </Animated.View>
  );
}

interface NodePalette {
  fill: string;
  border: string;
  text: string;
  highlight: string;
  shadow: string;
  glow: string;
  haloBg: string;
}

function paletteFor(
  state: LevelNodeState,
  highContrast: boolean,
  unlockedAccent?: { border: string; glow: string; halo: string; text: string },
): NodePalette {
  switch (state) {
    case 'locked':
      return {
        fill: colors.gardenNodeDormant,
        border: colors.divider,
        text: highContrast ? colors.textMuted : colors.textDim,
        highlight: 'rgba(0,0,0,0)',
        shadow: 'rgba(0,0,0,0)',
        glow: colors.gardenFog,
        haloBg: 'rgba(0,0,0,0)',
      };
    case 'unlocked':
      return {
        fill: colors.gardenNavySecondary,
        border: unlockedAccent?.border ?? colors.gardenCyanGlow,
        text: highContrast ? colors.text : (unlockedAccent?.text ?? colors.gardenCyanGlow),
        highlight: 'rgba(245,213,138,0.18)',
        shadow: 'rgba(7,11,23,0.55)',
        glow: unlockedAccent?.glow ?? 'rgba(0,229,204,0.45)',
        haloBg: unlockedAccent?.halo ?? 'rgba(0,229,204,0.18)',
      };
    case 'current':
      return {
        fill: colors.accentGold,
        border: colors.accentGoldGlow,
        text: colors.textOnGold,
        highlight: 'rgba(255,255,255,0.4)',
        shadow: 'rgba(82,55,12,0.45)',
        glow: 'rgba(245,213,138,0.55)',
        haloBg: 'rgba(245,213,138,0.22)',
      };
    case 'completed':
      return {
        fill: colors.surface,
        border: colors.success,
        text: colors.success,
        highlight: 'rgba(245,213,138,0.22)',
        shadow: 'rgba(7,11,23,0.55)',
        glow: 'rgba(91,214,168,0.55)',
        haloBg: 'rgba(91,214,168,0.18)',
      };
  }
}

function describe(
  index: number,
  state: LevelNodeState,
  stars: number,
  crown: boolean,
  context?: string,
): string {
  const base = context ? `Level ${index}, ${context}` : `Level ${index}`;
  if (state === 'locked') return `${base}, locked`;
  if (state === 'current') return `${base}, current`;
  if (state === 'completed') {
    return `${base}, completed${stars ? `, ${stars} stars` : ''}${crown ? ', crown' : ''}`;
  }
  return `${base}, unlocked`;
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  absolute: {
    position: 'absolute',
  },
  bevel: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  milestoneRing: {
    borderWidth: 3,
  },
  pressed: {
    opacity: 0.85,
  },
  highlight: {
    position: 'absolute',
    opacity: 0.7,
  },
  shadow: {
    position: 'absolute',
    borderWidth: 1.5,
    opacity: 0.6,
    transform: [{ translateY: 1 }],
  },
  frost: {
    position: 'absolute',
  },
  indexText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  starWrap: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
