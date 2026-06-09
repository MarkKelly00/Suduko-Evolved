import React, { useEffect, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  colors,
  duration,
  easing,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { hapticsService } from '@/services/haptics/hapticsService';

export interface SegmentedControlItem<TKey extends string> {
  key: TKey;
  label: string;
  /** Optional full label for screen readers when `label` is abbreviated to
   *  fit (e.g. "Logic" visible / "Logic Garden" announced). */
  accessibilityLabel?: string;
}

interface Props<TKey extends string> {
  items: SegmentedControlItem<TKey>[];
  activeKey: TKey;
  onChange: (key: TKey) => void;
  /** Maximum width — useful when the control sits inside a wide screen. */
  maxWidth?: number;
  /** Accent for the active thumb (border + glow). Defaults to gold; pass
   *  'violet' for the Astral Nexus world toggle so the cosmic world reads
   *  distinctly while staying cohesive with the gold brand. */
  accent?: 'gold' | 'violet';
  /** Drop the built-in horizontal gutter so the control can be embedded
   *  flush inside a parent that already provides padding (e.g. two controls
   *  sitting side-by-side in one row). */
  flush?: boolean;
}

/** Active-thumb border + glow per accent. Gold is the default brand accent;
 *  violet mirrors the Astral Nexus palette (`astralViolet*`). */
const THUMB_ACCENT = {
  gold: { borderColor: 'rgba(224, 185, 106, 0.35)', shadowColor: colors.accentGoldGlow },
  violet: { borderColor: 'rgba(157, 123, 255, 0.45)', shadowColor: colors.astralVioletGlow },
} as const;

/**
 * iOS-style segmented control. Single rounded track with a sliding "thumb"
 * highlighting the active segment. Distinct from `SegmentedTabs` (which has
 * an animated gold underline) so a screen can stack both without duplicating
 * the same visual treatment.
 */
export function SegmentedControl<TKey extends string>({
  items,
  activeKey,
  onChange,
  maxWidth,
  accent = 'gold',
  flush = false,
}: Props<TKey>) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const [trackWidth, setTrackWidth] = useState(0);
  const segmentWidth = trackWidth > 0 ? trackWidth / items.length : 0;
  const activeIndex = Math.max(
    0,
    items.findIndex((it) => it.key === activeKey),
  );

  const thumbX = useSharedValue(0);

  useEffect(() => {
    const target = activeIndex * segmentWidth;
    const d = reducedMotion ? 0 : duration.base;
    thumbX.value = withTiming(target, { duration: d, easing: easing.premium });
  }, [activeIndex, segmentWidth, thumbX, reducedMotion]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
    width: segmentWidth,
  }));

  const handleTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      style={[
        styles.outer,
        maxWidth ? { maxWidth, alignSelf: 'center' } : null,
        flush ? styles.outerFlush : null,
      ]}
    >
      <View style={styles.track} onLayout={handleTrackLayout}>
        {/* Sliding thumb sits behind the labels. */}
        {segmentWidth > 0 ? (
          <Animated.View style={[styles.thumb, thumbStyle, THUMB_ACCENT[accent]]} />
        ) : null}
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                if (active) return;
                hapticsService.selection();
                onChange(item.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.accessibilityLabel ?? item.label}
              style={styles.segment}
              hitSlop={6}
            >
              <Text
                style={[styles.label, active ? styles.labelActive : styles.labelInactive]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const TRACK_HEIGHT = 36;

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing.lg,
  },
  outerFlush: {
    paddingHorizontal: 0,
  },
  track: {
    height: TRACK_HEIGHT,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 2,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    backgroundColor: colors.surfaceElevated,
    borderRadius: (TRACK_HEIGHT - 4) / 2,
    borderWidth: 1,
    borderColor: 'rgba(224, 185, 106, 0.35)',
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  labelActive: {
    color: colors.text,
  },
  labelInactive: {
    color: colors.textMuted,
  },
});
