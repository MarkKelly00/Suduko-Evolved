/**
 * WorldUnlockPortal — the transition between World 1 and World 2.
 *
 * Lives INSIDE the saga ScrollView (absolutely positioned in the portal gap
 * after the Logic Garden Temple), so it scrolls naturally and its CTA is a real,
 * tappable, accessible Pressable. The portal ring art is a small local Skia
 * Canvas (not a full-screen panned layer), keeping it self-contained.
 *
 * States:
 *   • Dormant (level 30 not complete): dim violet ring, copy "Complete Logic
 *     Garden to open the path." No Play/Enter CTA.
 *   • Active (level 30 complete): energized violet/cyan/gold portal + an
 *     "Enter Astral Nexus" CTA that scrolls the map to World 2.
 *   • Just-activated: a one-shot energize flash (garden cyan/gold → cosmic
 *     violet) right after level 30 is cleared.
 *
 * Reduced motion OR `enableWorld2PortalAnimation=false` → static glow + simple
 * fade, no breathing/flash. VoiceOver gets a state-describing label.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { hapticsService } from '@/services/haptics/hapticsService';
import type { WorldTheme } from './worldThemes';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';

interface Props {
  /** Portal art width (centered). */
  width: number;
  /** True once Logic Garden's level 30 is complete → World 2 is reachable. */
  active: boolean;
  /** One-shot: fire the energize flash (set briefly right after level 30). */
  justActivated: boolean;
  /** Feature flag gate for the animated energize sequence. */
  animationEnabled: boolean;
  /** World 2 theme (cosmic palette). */
  theme: WorldTheme;
  /** CTA — scroll/focus to World 2. Only shown when active. */
  onEnter: () => void;
}

const ART_H = 210;
const RINGS = [70, 54, 38];

export function WorldUnlockPortal({
  width,
  active,
  justActivated,
  animationEnabled,
  theme,
  onEnter,
}: Props) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const animate = animationEnabled && !reducedMotion;

  const cx = width / 2;
  const cy = ART_H / 2;

  // Ring glow opacity + a one-shot energize flash.
  const glow = useSharedValue(active ? 0.9 : 0.2);
  const flash = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(glow);
      glow.value = withTiming(active ? 0.9 : 0.2, { duration: 260 });
      return undefined;
    }
    if (active) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.68, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      glow.value = withTiming(0.2, { duration: 400 });
    }
    return () => cancelAnimation(glow);
  }, [animate, active, glow]);

  useEffect(() => {
    if (!justActivated) return undefined;
    if (animate) {
      flash.value = withSequence(
        withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 1300, easing: Easing.in(Easing.quad) }),
      );
    } else {
      flash.value = withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(0, { duration: 360 }),
      );
    }
    return () => cancelAnimation(flash);
  }, [justActivated, animate, flash]);

  const coreOpacity = useDerivedValue(() => glow.value, [glow]);
  const flashOpacity = useDerivedValue(() => flash.value, [flash]);
  const ringOpacity = useDerivedValue(() => (active ? 0.4 + glow.value * 0.5 : 0.22), [glow, active]);

  const stateLabel = active
    ? 'World 2, Astral Nexus, unlocked. The path is open.'
    : 'World 2, Astral Nexus, locked. Complete Logic Garden to open the path.';

  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel={stateLabel}
    >
      <Canvas style={{ width, height: ART_H }}>
        {/* Outer "garden energy" halo feeding into the portal — cyan/gold,
            reads as World 1 energy entering the cosmic gate. */}
        <Circle cx={cx} cy={cy} r={95} opacity={active ? 0.18 : 0.08}>
          <RadialGradient
            c={vec(cx, cy)}
            r={95}
            colors={[colors.gardenCyanGlow, 'rgba(0,0,0,0)']}
          />
        </Circle>
        {/* Energize flash overlay (one-shot on activation). */}
        <Circle cx={cx} cy={cy} r={102} opacity={flashOpacity}>
          <RadialGradient c={vec(cx, cy)} r={102} colors={[theme.glow, 'rgba(0,0,0,0)']} />
        </Circle>
        {/* Cosmic core glow. */}
        <Circle cx={cx} cy={cy} r={62} opacity={coreOpacity}>
          <RadialGradient
            c={vec(cx, cy)}
            r={62}
            colors={[active ? theme.primary : theme.pathLocked, 'rgba(0,0,0,0)']}
          />
        </Circle>
        {/* Portal rings. */}
        <Group>
          {RINGS.map((r, i) => (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              style="stroke"
              strokeWidth={i === 0 ? 3 : 1.6}
              color={active ? (i === 0 ? theme.accent : theme.primary) : theme.pathLocked}
              opacity={ringOpacity}
            />
          ))}
          {/* Bright core star. */}
          <Circle cx={cx} cy={cy} r={6} color={active ? theme.glow : theme.pathLocked} opacity={active ? 1 : 0.4} />
        </Group>
      </Canvas>

      <Text style={styles.eyebrow}>WORLD 2</Text>
      <Text style={styles.title}>Astral Nexus</Text>
      {active ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter Astral Nexus"
          onPress={() => {
            hapticsService.medium();
            onEnter();
          }}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          hitSlop={8}
        >
          <Text style={styles.ctaText}>Enter Astral Nexus</Text>
        </Pressable>
      ) : (
        <Text style={styles.lockedCopy}>Complete Logic Garden to open the path.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: colors.astralVioletGlow,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.astralGoldGlow,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    marginTop: 2,
  },
  lockedCopy: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  cta: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(157,123,255,0.16)',
    borderWidth: 1,
    borderColor: colors.astralVioletGlow,
  },
  ctaPressed: {
    opacity: 0.8,
  },
  ctaText: {
    color: colors.astralVioletGlow,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wide,
  },
});
