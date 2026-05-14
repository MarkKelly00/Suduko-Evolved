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
  // Used to compute the indicator's absolute x.
  const [tabLayouts, setTabLayouts] = React.useState<
    ({ x: number; width: number } | null)[]
  >(() => items.map(() => null));
  // Label (Text wrapper) layouts — used to size the indicator to the
  // label's actual visible width, not the cell width. The previous
  // version sized to the cell, which made the rightmost tab's
  // underline appear to "leak" past the text (visible asymmetry when
  // the label was shorter than the cell — e.g. "Challenges" 25% cell).
  const [labelLayouts, setLabelLayouts] = React.useState<
    ({ x: number; width: number } | null)[]
  >(() => items.map(() => null));

  const activeIndex = Math.max(
    0,
    items.findIndex((it) => it.key === activeKey),
  );

  useEffect(() => {
    const tab = tabLayouts[activeIndex];
    const label = labelLayouts[activeIndex];
    if (!tab || !label) return;
    const d = reducedMotion ? 0 : duration.base;
    indicatorX.value = withTiming(tab.x + label.x, {
      duration: d,
      easing: easing.premium,
    });
    indicatorW.value = withTiming(label.width, {
      duration: d,
      easing: easing.premium,
    });
  }, [activeIndex, tabLayouts, labelLayouts, indicatorX, indicatorW, reducedMotion]);

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

  const handleLabelLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLabelLayouts((prev) => {
      const next = [...prev];
      next[i] = { x, width };
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
              {/* Inner wrapper sized to text content so the indicator
                  hugs the label, not the cell. */}
              <View style={styles.labelWrap} onLayout={handleLabelLayout(i)}>
                <Text
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
              </View>
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
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
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
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.6,
    shadowRadius: 6,
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
