import React, { useEffect } from 'react';
import {
  LayoutChangeEvent,
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

export interface SegmentedTabItem<TKey extends string> {
  key: TKey;
  label: string;
  badgeCount?: number;
}

interface Props<TKey extends string> {
  items: SegmentedTabItem<TKey>[];
  activeKey: TKey;
  onChange: (key: TKey) => void;
}

export function SegmentedTabs<TKey extends string>({
  items,
  activeKey,
  onChange,
}: Props<TKey>) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  // Tab (Pressable) layouts — each tab's x + width within the row.
  // Width is used with the Text's measured width to compute a
  // mathematically-centered indicator offset within the cell.
  const [tabLayouts, setTabLayouts] = React.useState<
    ({ x: number; width: number } | null)[]
  >(() => items.map(() => null));
  // Text widths — taken directly from the Text element's onLayout.
  // This is the actual rendered glyph width (no flex centering math
  // mixed in), so the indicator can hug each label precisely
  // regardless of cell width or where flex chose to position the
  // wrapping View. Measuring an intermediate `labelWrap` View was
  // flaky on the edge tabs: small rounding + the row's flex:1 cells
  // sometimes meant the centred wrapper landed off by 1–2px, which
  // read as visible misalignment on iPhone Pro Max.
  const [textWidths, setTextWidths] = React.useState<(number | null)[]>(
    () => items.map(() => null),
  );

  const activeIndex = Math.max(
    0,
    items.findIndex((it) => it.key === activeKey),
  );

  useEffect(() => {
    const tab = tabLayouts[activeIndex];
    const tw = textWidths[activeIndex];
    if (!tab || tw == null) return;
    // Centre the indicator under the tab cell, sized to the text.
    // Doing this mathematically removes any reliance on flex's
    // sub-pixel rounding for the centred wrapper.
    const x = tab.x + (tab.width - tw) / 2;
    const d = reducedMotion ? 0 : duration.base;
    indicatorX.value = withTiming(x, {
      duration: d,
      easing: easing.premium,
    });
    indicatorW.value = withTiming(tw, {
      duration: d,
      easing: easing.premium,
    });
  }, [activeIndex, tabLayouts, textWidths, indicatorX, indicatorW, reducedMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  const handleTabLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setTabLayouts((prev) => {
      const next = [...prev];
      next[i] = { x, width };
      return next;
    });
  };

  const handleTextLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setTextWidths((prev) => {
      if (prev[i] === width) return prev;
      const next = [...prev];
      next[i] = width;
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {items.map((item, i) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPress={() => {
                if (active) return;
                hapticsService.selection();
                onChange(item.key);
              }}
              onLayout={handleTabLayout(i)}
              style={styles.tab}
              hitSlop={6}
            >
              {/* Text is measured directly via onLayout so the
                  indicator's width = the actual glyph width. The
                  badge sits as a sibling so it doesn't influence
                  the underline (the underline tracks the label, not
                  the cell content). */}
              <Text
                onLayout={handleTextLayout(i)}
                style={[
                  styles.tabLabel,
                  active && styles.tabLabelActive,
                ]}
              >
                {item.label}
              </Text>
              {item.badgeCount != null && item.badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {Math.min(99, item.badgeCount)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, indicatorStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  tabLabelActive: {
    color: colors.text,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: colors.accentGold,
    borderRadius: 2,
    // Tighten the glow halo. The previous shadowRadius: 6 + opacity 0.6
    // bloomed the indicator outward by ~6px on each side, which read
    // as "the underline is wider than the text" — even though the
    // hard bar itself measured to the labelWrap precisely. A softer,
    // narrower glow keeps the gold accent tactile without inflating
    // the perceived width.
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.mistake,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: fontWeight.heavy,
  },
});
