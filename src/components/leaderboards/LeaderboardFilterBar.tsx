import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  colors,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';
import { hapticsService } from '@/services/haptics/hapticsService';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={() => {
        if (active) return;
        hapticsService.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
      hitSlop={8}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface LeaderboardFilterState {
  mode: 'campaign-level' | 'time-trial';
  levelId?: string;
  timeTrialMode?: string;
  /** Reserved for future weekly / daily buckets — only 'all-time' has data. */
  period: 'all-time' | 'week' | 'today';
}

interface Props {
  state: LeaderboardFilterState;
  campaignLevels: { id: string; label: string }[];
  timeTrialModes: { id: string; label: string }[];
  onChange: (next: LeaderboardFilterState) => void;
}

/**
 * Two-tier filter:
 *   1. iOS-style pill segmented control (Campaign vs Time Trial). Distinct
 *      visual from the gold-underline tab above so the hierarchy reads.
 *   2. Single horizontal chip strip — levels for Campaign, modes for
 *      Time Trial. We hide the strip entirely when there's exactly one
 *      option to keep the empty state clean.
 */
export function LeaderboardFilterBar({
  state,
  campaignLevels,
  timeTrialModes,
  onChange,
}: Props) {
  const modeItems = [
    { key: 'campaign-level' as const, label: 'Campaign' },
    { key: 'time-trial' as const, label: 'Time Trial' },
  ];

  const renderStrip = () => {
    if (state.mode === 'campaign-level') {
      if (campaignLevels.length === 0) {
        return (
          <View style={styles.emptyStrip}>
            <Text style={styles.emptyStripText}>
              Clear levels to populate this list.
            </Text>
          </View>
        );
      }
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          accessibilityRole="tablist"
          accessibilityLabel="Choose level"
        >
          {campaignLevels.map((lvl) => (
            <Chip
              key={lvl.id}
              label={lvl.label}
              active={state.levelId === lvl.id}
              onPress={() => onChange({ ...state, levelId: lvl.id })}
            />
          ))}
        </ScrollView>
      );
    }
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
        accessibilityLabel="Choose time trial mode"
      >
        {timeTrialModes.map((m) => (
          <Chip
            key={m.id}
            label={m.label}
            active={state.timeTrialMode === m.id}
            onPress={() => onChange({ ...state, timeTrialMode: m.id })}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <SegmentedControl
        items={modeItems}
        activeKey={state.mode}
        onChange={(key) => {
          if (key === 'campaign-level') {
            onChange({
              ...state,
              mode: 'campaign-level',
              levelId: state.levelId ?? campaignLevels[0]?.id,
            });
          } else {
            onChange({
              ...state,
              mode: 'time-trial',
              timeTrialMode: state.timeTrialMode ?? timeTrialModes[0]?.id,
            });
          }
        }}
      />
      {renderStrip()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  row: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  chipActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentGold,
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  chipLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  chipLabelActive: {
    color: colors.text,
  },
  emptyStrip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  emptyStripText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontStyle: 'italic',
  },
});
