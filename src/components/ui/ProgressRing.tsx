import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight } from '@/theme';
import { clamp } from '@/utils/clamp';

interface Props {
  /** 0-1 progress. */
  progress: number;
  size?: number;
  /** Optional centered label (e.g. XP value). */
  label?: string;
  /** Optional small caption below the label. */
  caption?: string;
}

/**
 * Lightweight Phase 3 progress ring built from layered Views.
 * Phase 4 will swap this to a Skia arc for crisp anti-aliased strokes and
 * animated fill, but the View-based version is good enough for placeholders
 * and avoids pulling Skia onto idle screens.
 */
export function ProgressRing({ progress, size = 96, label, caption }: Props) {
  const p = clamp(progress, 0, 1);
  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.outer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(3, size / 16),
          },
        ]}
      />
      <View
        style={[
          styles.inner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(3, size / 16),
            opacity: 0.25 + 0.75 * p,
          },
        ]}
      />
      <View style={styles.center}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    position: 'absolute',
    borderColor: colors.divider,
  },
  inner: {
    position: 'absolute',
    borderColor: colors.accentGold,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  caption: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
