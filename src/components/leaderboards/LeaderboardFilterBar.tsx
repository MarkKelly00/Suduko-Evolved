import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fontWeight, letterSpacing, radius, spacing } from '@/theme';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  subLabel?: string;
}

function Chip({ label, active, onPress, disabled, subLabel }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      style={[
        styles.chip,
        active && styles.chipActive,
        disabled && styles.chipDisabled,
      ]}
      hitSlop={6}
    >
      <Text
        style={[
          styles.chipLabel,
          active && styles.chipLabelActive,
          disabled && styles.chipLabelDisabled,
        ]}
      >
        {label}
      </Text>
      {subLabel ? <Text style={styles.chipSubLabel}>{subLabel}</Text> : null}
    </Pressable>
  );
}

export interface LeaderboardFilterState {
  mode: 'campaign-level' | 'time-trial';
  levelId?: string;
  timeTrialMode?: string;
  period: 'all-time' | 'week' | 'today';
}

interface Props {
  state: LeaderboardFilterState;
  /** Levels the user has completed; first entry is "All best" sigil. */
  campaignLevels: { id: string; label: string }[];
  /** Available TT modes — typically ['sprint-3min', 'daily-sprint'] */
  timeTrialModes: { id: string; label: string }[];
  onChange: (next: LeaderboardFilterState) => void;
}

export function LeaderboardFilterBar({
  state,
  campaignLevels,
  timeTrialModes,
  onChange,
}: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip
          label="Campaign"
          active={state.mode === 'campaign-level'}
          onPress={() =>
            onChange({
              ...state,
              mode: 'campaign-level',
              levelId: state.levelId ?? campaignLevels[0]?.id,
            })
          }
        />
        <Chip
          label="Time Trial"
          active={state.mode === 'time-trial'}
          onPress={() =>
            onChange({
              ...state,
              mode: 'time-trial',
              timeTrialMode: state.timeTrialMode ?? timeTrialModes[0]?.id,
            })
          }
        />
      </ScrollView>

      {state.mode === 'campaign-level' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {campaignLevels.length === 0 ? (
            <Text style={styles.empty}>Clear levels to populate this list.</Text>
          ) : (
            campaignLevels.map((lvl) => (
              <Chip
                key={lvl.id}
                label={lvl.label}
                active={state.levelId === lvl.id}
                onPress={() => onChange({ ...state, levelId: lvl.id })}
              />
            ))
          )}
        </ScrollView>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            <Chip
              label="All-time"
              active={state.period === 'all-time'}
              onPress={() => onChange({ ...state, period: 'all-time' })}
            />
            <Chip
              label="This week"
              active={state.period === 'week'}
              onPress={() => undefined}
              disabled
              subLabel="Coming soon"
            />
            <Chip
              label="Today"
              active={state.period === 'today'}
              onPress={() => undefined}
              disabled
              subLabel="Coming soon"
            />
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: spacing.sm,
  },
  row: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentGold,
  },
  chipDisabled: {
    opacity: 0.5,
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
  chipLabelDisabled: {
    color: colors.textDim,
  },
  chipSubLabel: {
    color: colors.textDim,
    fontSize: 9,
    marginTop: 2,
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
