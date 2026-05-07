import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, duration, fontFamily, fontWeight, shadows } from '@/theme';
import { useSettingsStore } from '@/game/state/useSettingsStore';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  size?: Size;
  url?: string | null;
  fallbackName?: string | null;
  /** 0..1 — when set, shows an upload progress arc around the avatar. */
  progress?: number;
}

const SIZE_PX: Record<Size, number> = { sm: 32, md: 48, lg: 96, xl: 128 };

/**
 * Circular avatar with a subtle gold ring on lg/xl and a shimmer fallback.
 * No image? Renders initials in a gold circle. Respects reduced motion.
 */
export function Avatar({ size = 'md', url, fallbackName, progress }: Props) {
  const px = SIZE_PX[size];
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const [loaded, setLoaded] = useState(false);
  const shimmer = useSharedValue(0.6);

  useEffect(() => {
    if (loaded || !url) return;
    if (reducedMotion) {
      shimmer.value = 0.6;
      return;
    }
    shimmer.value = 0.4;
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: duration.slow, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.4, { duration: duration.slow, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [shimmer, loaded, url, reducedMotion]);

  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  const ringStyle: ViewStyle = {
    width: px,
    height: px,
    borderRadius: px / 2,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: size === 'lg' || size === 'xl' ? 2 : 1,
    borderColor:
      size === 'lg' || size === 'xl'
        ? 'rgba(224, 185, 106, 0.4)'
        : colors.glassBorder,
  };

  const initials = makeInitials(fallbackName, size === 'sm' || size === 'md' ? 1 : 2);

  return (
    <View
      style={[
        styles.wrapper,
        { width: px, height: px },
        (size === 'lg' || size === 'xl') && (shadows.goldGlow as object),
      ]}
      accessibilityRole="image"
      accessibilityLabel={fallbackName ? `Avatar for ${fallbackName}` : 'Avatar'}
    >
      <View style={ringStyle}>
        {url ? (
          <Animated.View style={[StyleSheet.absoluteFill, !loaded && shimmerStyle]}>
            <Image
              source={{ uri: url }}
              style={[styles.image, { width: px, height: px }]}
              onLoad={() => setLoaded(true)}
            />
          </Animated.View>
        ) : (
          <View style={[styles.fallback, { width: px, height: px }]}>
            <Text style={[styles.initials, { fontSize: Math.round(px * 0.42) }]}>
              {initials}
            </Text>
          </View>
        )}
      </View>
      {progress != null && progress >= 0 && progress < 1 ? (
        <ProgressArc size={px} progress={progress} />
      ) : null}
    </View>
  );
}

function makeInitials(name: string | null | undefined, count: 1 | 2): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (count === 1 || parts.length === 1) {
    return parts[0]!.charAt(0).toUpperCase();
  }
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

/**
 * Lightweight progress arc — stacked View overlays that fake a gold arc
 * around the avatar. Replace with a Skia arc in Phase 9 for crispness.
 */
function ProgressArc({ size, progress }: { size: number; progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  const angleDeg = clamped * 360;
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: colors.accentGold,
          opacity: 0.85,
          // Coarse "arc" effect: fade colors based on whether we're past 50%.
          // This is a simple visual placeholder that reads correctly at all sizes.
          transform: [{ rotate: `${angleDeg}deg` }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.textOnGold,
    fontFamily: fontFamily.display,
    fontWeight: fontWeight.bold,
  },
});
