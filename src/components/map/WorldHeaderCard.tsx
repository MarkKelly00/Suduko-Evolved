/**
 * WorldHeaderCard — the World 2 intro card, rendered inside the saga ScrollView
 * just above level 31. Mirrors the World 1 header block but as a contained glass
 * card with the cosmic accent.
 *
 * Copy (per brief):
 *   WORLD 2 / Astral Nexus / "Where patterns become constellations."
 *   Body: opens into a higher sky — prism bridges, star archives, the
 *         Celestial Engine.
 *   CTA: "Begin Level 31" — opens the level-31 preview modal (never
 *        auto-launches gameplay, preserving the tap→preview contract).
 *
 * The CTA is disabled-styled until World 2 is unlocked; tapping it still opens
 * the (locked) preview so the player understands the gate.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  width: number;
  /** Whether World 2 is unlocked (level 30 complete). Styles the CTA. */
  unlocked: boolean;
  /** Opens the level-31 preview modal. */
  onBeginLevel31: () => void;
}

export function WorldHeaderCard({ width, unlocked, onBeginLevel31 }: Props) {
  return (
    <View style={[styles.card, { width: Math.min(width - spacing.lg * 2, 420) }]}>
      <Text style={styles.eyebrow}>WORLD 2</Text>
      <Text style={styles.title}>Astral Nexus</Text>
      <Text style={styles.tagline}>Where patterns become constellations.</Text>
      <Text style={styles.body}>
        The garden opens into a higher sky. Solve through prism bridges, star
        archives, and the Celestial Engine.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unlocked ? 'Begin Level 31' : 'Level 31 locked. Complete Logic Garden first.'}
        onPress={onBeginLevel31}
        style={({ pressed }) => [
          styles.cta,
          !unlocked && styles.ctaLocked,
          pressed && styles.ctaPressed,
        ]}
        hitSlop={8}
      >
        <Text style={[styles.ctaText, !unlocked && styles.ctaTextLocked]}>
          {unlocked ? 'Begin Level 31' : 'Locked'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(16,13,40,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(157,123,255,0.30)',
  },
  eyebrow: {
    color: colors.astralVioletGlow,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    fontWeight: fontWeight.bold,
  },
  title: {
    color: colors.astralGoldGlow,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    marginTop: spacing.xs,
  },
  tagline: {
    color: colors.astralStarlight,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(157,123,255,0.18)',
    borderWidth: 1,
    borderColor: colors.astralVioletGlow,
  },
  ctaLocked: {
    backgroundColor: 'rgba(74,88,120,0.18)',
    borderColor: colors.divider,
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
  ctaTextLocked: {
    color: colors.textDim,
  },
});
