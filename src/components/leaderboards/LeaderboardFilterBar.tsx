import React, { useMemo } from 'react';
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
  /** Tiered weight so the hierarchy reads (world > biome > level) — mirrors
   *  the website's leaderboard. */
  size?: 'level' | 'biome' | 'world';
}

function Chip({ label, active, onPress, size = 'level' }: ChipProps) {
  const heavy = size === 'biome' || size === 'world';
  return (
    <Pressable
      onPress={() => {
        if (active) return;
        hapticsService.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        heavy && styles.chipBiome,
        size === 'world' && styles.chipWorld,
        active && styles.chipActive,
        active && heavy && styles.chipBiomeActive,
        active && size === 'world' && styles.chipWorldActive,
      ]}
      hitSlop={8}
    >
      <Text
        style={[
          styles.chipLabel,
          heavy && styles.chipLabelBiome,
          size === 'world' && styles.chipLabelWorld,
          active && styles.chipLabelActive,
        ]}
      >
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

export interface CampaignLevelOption {
  id: string;
  label: string;
  /** 1..30 numeric index — drives biome grouping + sort order so we
   *  never inherit lexicographic ordering bugs (L1, L10, L11, L2…). */
  index: number;
}

export interface CampaignBiomeOption {
  id: string;
  label: string;
  /** Inclusive global (1..60) level range owned by this biome/act. */
  fromLevel: number;
  toLevel: number;
  /** World this act belongs to (1 = Logic Garden, 2 = Astral Nexus) — drives
   *  the top-level World selector tier. */
  worldNumber: number;
  worldName: string;
}

interface Props {
  state: LeaderboardFilterState;
  /** All 30 campaign levels in numeric order (NOT derived from progress
   *  store — the bar always renders the full World 1 set, mirroring
   *  the website). */
  campaignLevels: CampaignLevelOption[];
  /** Biome groupings for the level picker (Seed Grove / Moonvine Stream /
   *  Oracle Bloom). 10 levels each. */
  campaignBiomes: CampaignBiomeOption[];
  timeTrialModes: { id: string; label: string }[];
  onChange: (next: LeaderboardFilterState) => void;
}

/**
 * Three-tier filter (Campaign mode) — mirrors the website's
 * /leaderboards experience:
 *   1. SegmentedControl: Campaign vs Time Trial
 *   2. Biome chips: Seed Grove / Moonvine Stream / Oracle Bloom
 *   3. Level pills: L1..L10 within the active biome (10 at a time)
 *
 * The biome is derived from `state.levelId` so deep links + restoration
 * land on the correct biome automatically. Switching biomes snaps the
 * level to the biome's first level so the resolved board is always
 * inside the visible pill row.
 */
export function LeaderboardFilterBar({
  state,
  campaignLevels,
  campaignBiomes,
  timeTrialModes,
  onChange,
}: Props) {
  const modeItems = [
    { key: 'campaign-level' as const, label: 'Campaign' },
    { key: 'time-trial' as const, label: 'Time Trial' },
  ];

  // Derive the active biome from the selected levelId so the row +
  // pills stay in sync with deep-link / route params.
  const activeBiome = useMemo(() => {
    const lvl = campaignLevels.find((l) => l.id === state.levelId);
    if (!lvl) return campaignBiomes[0];
    return (
      campaignBiomes.find(
        (b) => lvl.index >= b.fromLevel && lvl.index <= b.toLevel,
      ) ?? campaignBiomes[0]
    );
  }, [campaignBiomes, campaignLevels, state.levelId]);

  // Distinct worlds (Logic Garden / Astral Nexus) in source order — drives the
  // top-level World selector. Only rendered when more than one world exists.
  const worlds = useMemo(() => {
    const seen = new Map<number, string>();
    for (const b of campaignBiomes) {
      if (!seen.has(b.worldNumber)) seen.set(b.worldNumber, b.worldName);
    }
    return Array.from(seen, ([worldNumber, worldName]) => ({ worldNumber, worldName }));
  }, [campaignBiomes]);

  const activeWorld = activeBiome?.worldNumber ?? worlds[0]?.worldNumber;

  // Acts visible in the biome row — filtered to the active world.
  const visibleBiomes = useMemo(
    () => campaignBiomes.filter((b) => b.worldNumber === activeWorld),
    [campaignBiomes, activeWorld],
  );

  // Levels visible in the pill row — filtered to the active biome.
  const visibleLevels = useMemo(() => {
    if (!activeBiome) return campaignLevels;
    return campaignLevels.filter(
      (l) => l.index >= activeBiome.fromLevel && l.index <= activeBiome.toLevel,
    );
  }, [campaignLevels, activeBiome]);

  const handleWorldSelect = (worldNumber: number) => {
    // Hop to the first act of the chosen world, then its first level.
    const firstBiome = campaignBiomes.find((b) => b.worldNumber === worldNumber);
    if (!firstBiome) return;
    const firstLevel = campaignLevels.find((l) => l.index === firstBiome.fromLevel);
    if (firstLevel) onChange({ ...state, levelId: firstLevel.id });
  };

  const handleBiomeSelect = (biome: CampaignBiomeOption) => {
    // Snap to the first level inside this biome (or keep current if it's
    // already in-range — but the useMemo above already guarantees the
    // active biome matches the level, so this is always a hop).
    const firstInBiome = campaignLevels.find(
      (l) => l.index === biome.fromLevel,
    );
    if (!firstInBiome) return;
    onChange({ ...state, levelId: firstInBiome.id });
  };

  const renderCampaign = () => {
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
      <View style={styles.campaignStack}>
        {worlds.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            accessibilityRole="tablist"
            accessibilityLabel="Choose world"
          >
            {worlds.map((w) => (
              <Chip
                key={w.worldNumber}
                label={w.worldName}
                active={activeWorld === w.worldNumber}
                onPress={() => handleWorldSelect(w.worldNumber)}
                size="world"
              />
            ))}
          </ScrollView>
        ) : null}
        {visibleBiomes.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            accessibilityRole="tablist"
            accessibilityLabel="Choose biome"
          >
            {visibleBiomes.map((biome) => (
              <Chip
                key={biome.id}
                label={biome.label}
                active={activeBiome?.id === biome.id}
                onPress={() => handleBiomeSelect(biome)}
                size="biome"
              />
            ))}
          </ScrollView>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          accessibilityRole="tablist"
          accessibilityLabel="Choose level"
        >
          {visibleLevels.map((lvl) => (
            <Chip
              key={lvl.id}
              label={lvl.label}
              active={state.levelId === lvl.id}
              onPress={() => onChange({ ...state, levelId: lvl.id })}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTimeTrial = () => (
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
      {state.mode === 'campaign-level' ? renderCampaign() : renderTimeTrial()}
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
  campaignStack: {
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
  chipBiome: {
    paddingHorizontal: spacing.base + 2,
    paddingVertical: 9,
  },
  chipWorld: {
    paddingHorizontal: spacing.base + 4,
    paddingVertical: 10,
    borderColor: 'rgba(224, 185, 106, 0.22)',
  },
  chipActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentGold,
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  chipBiomeActive: {
    // Stronger glow for biome chips so the hierarchy still reads
    // when both rows are visible at once.
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  chipWorldActive: {
    // Strongest treatment — the World tier sits at the top of the hierarchy.
    backgroundColor: 'rgba(224, 185, 106, 0.16)',
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  chipLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  chipLabelBiome: {
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  chipLabelWorld: {
    color: colors.accentGold,
    fontWeight: fontWeight.bold,
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
