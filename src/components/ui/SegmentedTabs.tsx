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
  const [layouts, setLayouts] = React.useState<({ x: number; width: number } | null)[]>(
    () => items.map(() => null),
  );

  const activeIndex = Math.max(
    0,
    items.findIndex((it) => it.key === activeKey),
  );

  useEffect(() => {
    const target = layouts[activeIndex];
    if (!target) return;
    const d = reducedMotion ? 0 : duration.base;
    indicatorX.value = withTiming(target.x, { duration: d, easing: easing.premium });
    indicatorW.value = withTiming(target.width, { duration: d, easing: easing.premium });
  }, [activeIndex, layouts, indicatorX, indicatorW, reducedMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  const handleLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => {
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
              onLayout={handleLayout(i)}
              style={styles.tab}
              hitSlop={6}
            >
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
                  <Text style={styles.badgeText}>{Math.min(99, item.badgeCount)}</Text>
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
