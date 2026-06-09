import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { GlassCard } from '@/components/ui/GlassCard';
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
  /** Tiered weight so the hierarchy reads (world > biome > level). */
  size?: 'level' | 'biome' | 'world';
  /** Accent for the active world chip — gold (Logic Garden) or violet
   *  (Astral Nexus). Act + level chips are always gold. */
  accent?: 'gold' | 'violet';
}

function Chip({ label, active, onPress, size = 'level', accent = 'gold' }: ChipProps) {
  const heavy = size === 'biome' || size === 'world';
  const violet = accent === 'violet';
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
        heavy && styles.chipHeavy,
        size === 'level' && styles.chipLevelResting,
        active && (violet ? styles.chipActiveViolet : styles.chipActive),
      ]}
      hitSlop={8}
    >
      <Text
        style={[
          styles.chipLabel,
          heavy && styles.chipLabelHeavy,
          size === 'world' && styles.chipLabelWorld,
          size === 'level' && styles.chipLabelLevel,
          active && (violet ? styles.chipLabelActiveViolet : styles.chipLabelActive),
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
  /** 1..60 numeric index — drives biome grouping + sort order so we
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
  /** All campaign levels in numeric order (NOT derived from progress store —
   *  the bar always renders the full set, mirroring the website). */
  campaignLevels: CampaignLevelOption[];
  /** Act groupings for the level picker, across enabled worlds. */
  campaignBiomes: CampaignBiomeOption[];
  timeTrialModes: { id: string; label: string }[];
  onChange: (next: LeaderboardFilterState) => void;
}

/**
 * Campaign filter — mirrors the website's /leaderboards card: world → act →
 * level all live inside ONE glass panel, with a breadcrumb caption beneath
 * (e.g. "Logic Garden · Seed Grove · Level 1"). Wrapping the tiers in a single
 * framed card — instead of three separate floating chip strips — is what makes
 * it read as one cohesive control rather than "too many lines".
 *
 * The active world/act are derived from `state.levelId` so deep links +
 * restoration land correctly. Switching world/act snaps the level so the
 * resolved board is always inside the visible pill row.
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

  // Derive the active biome from the selected levelId so the rows stay in
  // sync with deep-link / route params.
  const activeBiome = useMemo(() => {
    const lvl = campaignLevels.find((l) => l.id === state.levelId);
    if (!lvl) return campaignBiomes[0];
    return (
      campaignBiomes.find(
        (b) => lvl.index >= b.fromLevel && lvl.index <= b.toLevel,
      ) ?? campaignBiomes[0]
    );
  }, [campaignBiomes, campaignLevels, state.levelId]);

  // Distinct worlds (Logic Garden / Astral Nexus) in source order. Only shown
  // when more than one world exists (single-world builds are unchanged).
  const worlds = useMemo(() => {
    const seen = new Map<number, string>();
    for (const b of campaignBiomes) {
      if (!seen.has(b.worldNumber)) seen.set(b.worldNumber, b.worldName);
    }
    return Array.from(seen, ([worldNumber, worldName]) => ({ worldNumber, worldName }));
  }, [campaignBiomes]);

  const activeWorld = activeBiome?.worldNumber ?? worlds[0]?.worldNumber;

  // Acts visible in the act row — filtered to the active world.
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
    const firstBiome = campaignBiomes.find((b) => b.worldNumber === worldNumber);
    if (!firstBiome) return;
    const firstLevel = campaignLevels.find((l) => l.index === firstBiome.fromLevel);
    if (firstLevel) onChange({ ...state, levelId: firstLevel.id });
  };

  const handleBiomeSelect = (biome: CampaignBiomeOption) => {
    const firstInBiome = campaignLevels.find((l) => l.index === biome.fromLevel);
    if (!firstInBiome) return;
    onChange({ ...state, levelId: firstInBiome.id });
  };

  const renderCampaign = () => {
    if (campaignLevels.length === 0) {
      return (
        <View style={styles.cardOuter}>
          <GlassCard flat style={styles.filterCard}>
            <Text style={styles.emptyStripText}>
              Clear levels to populate this list.
            </Text>
          </GlassCard>
        </View>
      );
    }
    const worldName = worlds.find((w) => w.worldNumber === activeWorld)?.worldName;
    const activeLevelOpt = campaignLevels.find((l) => l.id === state.levelId);
    return (
      <View style={styles.cardOuter}>
        <GlassCard flat style={styles.filterCard}>
          {worlds.length > 1 ? (
            <View
              style={styles.tierRow}
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
                  accent={w.worldNumber === 2 ? 'violet' : 'gold'}
                />
              ))}
            </View>
          ) : null}
          {visibleBiomes.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollRow}
              accessibilityRole="tablist"
              accessibilityLabel="Choose act"
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
            contentContainerStyle={styles.scrollRow}
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
          <Text style={styles.breadcrumb} numberOfLines={1}>
            {worldName ? (
              <Text
                style={
                  activeWorld === 2 ? styles.crumbWorldViolet : styles.crumbWorldGold
                }
              >
                {worldName}
              </Text>
            ) : null}
            {worldName && activeBiome ? ' · ' : ''}
            {activeBiome ? activeBiome.label : ''}
            {activeLevelOpt ? ` · Level ${activeLevelOpt.index}` : ''}
          </Text>
        </GlassCard>
      </View>
    );
  };

  const renderTimeTrial = () => (
    <View style={styles.cardOuter}>
      <GlassCard flat style={styles.filterCard}>
        <View
          style={styles.tierRow}
          accessibilityRole="tablist"
          accessibilityLabel="Choose time trial mode"
        >
          {timeTrialModes.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              active={state.timeTrialMode === m.id}
              onPress={() => onChange({ ...state, timeTrialMode: m.id })}
              size="biome"
            />
          ))}
        </View>
        <Text style={styles.breadcrumb} numberOfLines={1}>
          Time Trial · All-time
        </Text>
      </GlassCard>
    </View>
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
  cardOuter: {
    paddingHorizontal: spacing.lg,
  },
  // The single framed panel that holds all tiers — replaces the three
  // separate floating chip strips so the filter reads as one control.
  filterCard: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.xl,
  },
  // World / act rows wrap (≤3 items) so there's no ambiguous horizontal scroll.
  tierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // Act + level rows scroll horizontally so long act names stay on one tidy
  // line; a touch of right padding lets the last chip peek as a scroll cue.
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    // Transparent border at rest so the active state can add a coloured ring
    // without shifting layout. No resting border keeps the card uncluttered.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipHeavy: {
    paddingHorizontal: spacing.base,
    paddingVertical: 7,
  },
  // Level pills carry a faint fill at rest (like the website) so the granular
  // picker reads as a distinct band without needing borders.
  chipLevelResting: {
    backgroundColor: 'rgba(31, 42, 68, 0.6)',
  },
  chipActive: {
    backgroundColor: 'rgba(224, 185, 106, 0.16)',
    borderColor: 'rgba(224, 185, 106, 0.5)',
    // Soft, restrained glow — the ring + tint already carry the selected
    // state. A heavy bloom is what read as "gamey".
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  chipActiveViolet: {
    backgroundColor: 'rgba(157, 123, 255, 0.18)',
    borderColor: 'rgba(157, 123, 255, 0.5)',
    shadowColor: colors.astralVioletGlow,
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  chipLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  chipLabelHeavy: {
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  chipLabelWorld: {
    fontWeight: fontWeight.bold,
  },
  chipLabelLevel: {
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  chipLabelActive: {
    color: colors.accentGoldGlow,
  },
  chipLabelActiveViolet: {
    color: colors.astralVioletGlow,
  },
  breadcrumb: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
    marginTop: spacing.xxs,
  },
  crumbWorldGold: {
    color: colors.accentGoldGlow,
    fontWeight: fontWeight.bold,
  },
  crumbWorldViolet: {
    color: colors.astralVioletGlow,
    fontWeight: fontWeight.bold,
  },
  emptyStripText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontStyle: 'italic',
  },
});
