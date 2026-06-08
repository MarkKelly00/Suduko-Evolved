/**
 * AchievementsScreen
 *
 * In-app gallery for all 20 Game Center achievements. Reachable from
 * Profile and Settings (the existing "Show achievements" GC modal
 * buttons stay alongside as the native fallback).
 *
 * Each card shows:
 *   - the AchievementGlyph (PNG when bundled, tier-coloured fallback otherwise)
 *   - achievement name + points
 *   - tier label as a coloured pill
 *   - lock state — based on MMKV `gameCenter.reportedAchievements`
 *   - count-based progress bar where applicable (stars, crowns, levels)
 *
 * Tap a card to open the detail sheet (description + unlock criteria).
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AchievementGlyph } from '@/components/achievements/AchievementGlyph';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { isReported } from '@/game/achievements/achievementProgress';
import {
  ACHIEVEMENT_METADATA,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type AchievementCategory,
} from '@/game/achievements/metadata';
import {
  getAchievementTier,
  TIER_COLORS,
} from '@/game/achievements/tiers';
import { useProgressStore } from '@/game/state/useProgressStore';
import { WORLD_1_LEVELS } from '@/game/content/levels';
import {
  ACHIEVEMENT_POINTS,
  ALL_ACHIEVEMENT_IDS,
  GAME_CENTER_ACHIEVEMENTS,
  gameCenterService,
  isPlatformIOS,
  type GameCenterAchievementId,
} from '@/services/gameCenter';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';

const A = GAME_CENTER_ACHIEVEMENTS;

interface ProgressSnapshot {
  totalStars: number;
  totalCrowns: number;
  seedGroveCleared: number;
  moonvineCleared: number;
  oracleCleared: number;
  totalLevelsCleared: number;
}

function useProgressSnapshot(): ProgressSnapshot {
  const levels = useProgressStore((s) => s.levels);
  return useMemo(() => {
    let totalStars = 0;
    let totalCrowns = 0;
    let seedGrove = 0;
    let moonvine = 0;
    let oracle = 0;
    let totalCleared = 0;
    for (const [levelId, entry] of Object.entries(levels)) {
      totalStars += entry.stars;
      if (entry.crown) totalCrowns += 1;
      totalCleared += 1;
      const idx = WORLD_1_LEVELS.findIndex((l) => l.id === levelId);
      // 1–10 → Seed Grove, 11–20 → Moonvine, 21–30 → Oracle Bloom.
      if (idx >= 0 && idx < 10) seedGrove += 1;
      else if (idx >= 10 && idx < 20) moonvine += 1;
      else if (idx >= 20 && idx < 30) oracle += 1;
    }
    return {
      totalStars,
      totalCrowns,
      seedGroveCleared: seedGrove,
      moonvineCleared: moonvine,
      oracleCleared: oracle,
      totalLevelsCleared: totalCleared,
    };
  }, [levels]);
}

interface ProgressDescriptor {
  current: number;
  target: number;
}

function getProgressFor(
  id: GameCenterAchievementId,
  snap: ProgressSnapshot,
): ProgressDescriptor | null {
  switch (id) {
    case A.STAR_COLLECTOR:
      return { current: Math.min(snap.totalStars, 30), target: 30 };
    case A.STAR_HARMONY:
      return { current: Math.min(snap.totalStars, 60), target: 60 };
    case A.PERFECT_CONSTELLATION:
      return { current: Math.min(snap.totalStars, 90), target: 90 };
    case A.CROWNED_LOGIC:
      return { current: Math.min(snap.totalCrowns, 10), target: 10 };
    case A.CROWN_GARDEN:
      return { current: Math.min(snap.totalCrowns, 30), target: 30 };
    case A.SEED_GROVE_COMPLETE:
      return { current: Math.min(snap.seedGroveCleared, 10), target: 10 };
    case A.MOONVINE_STREAM_COMPLETE:
      return { current: Math.min(snap.moonvineCleared, 10), target: 10 };
    case A.ORACLE_BLOOM_COMPLETE:
      return { current: Math.min(snap.oracleCleared, 10), target: 10 };
    case A.LOGIC_GARDEN_COMPLETE:
      return { current: Math.min(snap.totalLevelsCleared, 30), target: 30 };
    default:
      return null;
  }
}

function groupByCategory(): Record<AchievementCategory, GameCenterAchievementId[]> {
  const groups: Record<AchievementCategory, GameCenterAchievementId[]> = {
    campaign: [],
    nexus: [],
    sprint: [],
    duels: [],
    social: [],
    skill: [],
    mindfulness: [],
  };
  for (const id of ALL_ACHIEVEMENT_IDS) {
    const cat = ACHIEVEMENT_METADATA[id]?.category ?? 'campaign';
    groups[cat].push(id);
  }
  return groups;
}

function AchievementsScreen() {
  const snap = useProgressSnapshot();
  const grouped = useMemo(groupByCategory, []);
  const [activeId, setActiveId] = useState<GameCenterAchievementId | null>(null);

  // Reading the MMKV set on every render is acceptable — useProgressStore
  // re-renders the screen on relevant changes, and `readReported()` is
  // a synchronous in-memory lookup post-hydration.
  const isUnlocked = (id: GameCenterAchievementId) => isReported(id);

  const unlockedCount = ALL_ACHIEVEMENT_IDS.filter(isUnlocked).length;
  const totalPoints = ALL_ACHIEVEMENT_IDS.filter(isUnlocked).reduce(
    (sum, id) => sum + (ACHIEVEMENT_POINTS[id] ?? 0),
    0,
  );
  const maxPoints = ALL_ACHIEVEMENT_IDS.reduce(
    (sum, id) => sum + (ACHIEVEMENT_POINTS[id] ?? 0),
    0,
  );

  return (
    <ScreenBackground>
      <TopBar title="Achievements" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GlassCard style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                {`${unlockedCount}/${ALL_ACHIEVEMENT_IDS.length}`}
              </Text>
              <Text style={styles.summaryLabel}>Unlocked</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{`${totalPoints}/${maxPoints}`}</Text>
              <Text style={styles.summaryLabel}>Points</Text>
            </View>
          </View>
          {isPlatformIOS() ? (
            <Pressable
              onPress={() => void gameCenterService.showAchievements()}
              accessibilityRole="button"
              accessibilityLabel="Open Game Center achievements"
              style={({ pressed }) => [
                styles.gcLink,
                pressed && styles.gcLinkPressed,
              ]}
            >
              <Text style={styles.gcLinkText}>{'View in Game Center →'}</Text>
            </Pressable>
          ) : null}
        </GlassCard>

        {CATEGORY_ORDER.map((cat) => {
          const ids = grouped[cat];
          if (ids.length === 0) return null;
          return (
            <View key={cat} style={styles.section}>
              <Text style={styles.sectionTitle}>{CATEGORY_LABELS[cat]}</Text>
              <View style={styles.grid}>
                {ids.map((id) => (
                  <AchievementCard
                    key={id}
                    id={id}
                    unlocked={isUnlocked(id)}
                    progress={getProgressFor(id, snap)}
                    onPress={() => setActiveId(id)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <AchievementDetailSheet
        id={activeId}
        unlocked={activeId != null ? isUnlocked(activeId) : false}
        progress={activeId != null ? getProgressFor(activeId, snap) : null}
        onClose={() => setActiveId(null)}
      />
    </ScreenBackground>
  );
}

interface CardProps {
  id: GameCenterAchievementId;
  unlocked: boolean;
  progress: ProgressDescriptor | null;
  onPress: () => void;
}

function AchievementCard({ id, unlocked, progress, onPress }: CardProps) {
  const meta = ACHIEVEMENT_METADATA[id];
  const tier = getAchievementTier(id);
  const tone = TIER_COLORS[tier];
  const points = ACHIEVEMENT_POINTS[id] ?? 0;
  const pct = progress
    ? Math.min(1, Math.max(0, progress.current / progress.target))
    : unlocked
      ? 1
      : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${meta?.name ?? id}, ${unlocked ? 'unlocked' : 'locked'}. ${points} points. Tap for details.`}
      style={({ pressed }) => [
        styles.card,
        { borderColor: unlocked ? tone.primary : colors.divider },
        pressed && styles.cardPressed,
      ]}
    >
      <AchievementGlyph id={id} size={72} locked={!unlocked} />
      <Text style={styles.cardName} numberOfLines={1}>
        {meta?.name ?? id}
      </Text>
      <View style={[styles.tierPill, { borderColor: tone.primary }]}>
        <Text style={[styles.tierPillText, { color: tone.primary }]}>
          {tone.label}
        </Text>
        <Text style={styles.tierPillPoints}>{`+${points}`}</Text>
      </View>
      {progress != null ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(pct * 100)}%`,
                backgroundColor: unlocked ? tone.primary : colors.accentTeal,
              },
            ]}
          />
        </View>
      ) : null}
      {progress != null ? (
        <Text style={styles.progressText}>
          {`${progress.current} / ${progress.target}`}
        </Text>
      ) : null}
    </Pressable>
  );
}

interface DetailProps {
  id: GameCenterAchievementId | null;
  unlocked: boolean;
  progress: ProgressDescriptor | null;
  onClose: () => void;
}

function AchievementDetailSheet({ id, unlocked, progress, onClose }: DetailProps) {
  if (id == null) return null;
  const meta = ACHIEVEMENT_METADATA[id];
  const tier = getAchievementTier(id);
  const tone = TIER_COLORS[tier];
  const points = ACHIEVEMENT_POINTS[id] ?? 0;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <View style={styles.modalGlyphRow}>
            <AchievementGlyph id={id} size={96} locked={!unlocked} />
            <View style={styles.modalHeading}>
              <Text style={[styles.modalEyebrow, { color: tone.primary }]}>
                {tone.label.toUpperCase()}
              </Text>
              <Text style={styles.modalName}>{meta?.name ?? id}</Text>
              <Text style={styles.modalPoints}>{`+${points} pts`}</Text>
            </View>
          </View>
          <Text style={styles.modalDescription}>{meta?.description ?? ''}</Text>
          {progress != null ? (
            <View style={styles.modalProgressBlock}>
              <Text style={styles.modalProgressLabel}>
                {meta?.progressLabel ?? 'Progress'}
              </Text>
              <Text style={styles.modalProgressValue}>
                {`${progress.current} / ${progress.target}`}
              </Text>
            </View>
          ) : null}
          <View
            style={[
              styles.modalStatusPill,
              {
                borderColor: unlocked ? tone.primary : colors.divider,
                backgroundColor: unlocked
                  ? 'rgba(224, 185, 106, 0.12)'
                  : 'rgba(255, 255, 255, 0.04)',
              },
            ]}
          >
            <Text
              style={[
                styles.modalStatusText,
                { color: unlocked ? tone.primary : colors.textMuted },
              ]}
            >
              {unlocked ? 'Unlocked' : 'Locked'}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.modalCloseBtn,
              pressed && styles.modalCloseBtnPressed,
            ]}
          >
            <Text style={styles.modalCloseLabel}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default AchievementsScreen;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  summaryCard: {
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryStat: {
    flex: 1,
  },
  summaryValue: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  gcLink: {
    paddingVertical: spacing.xxs,
  },
  gcLinkPressed: { opacity: 0.7 },
  gcLinkText: {
    color: colors.accentGoldGlow,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tierPillText: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wider,
  },
  tierPillPoints: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.semibold,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: radius.xs,
    overflow: 'hidden',
    marginTop: spacing.xxs,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.medium,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    gap: spacing.base,
  },
  modalGlyphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  modalHeading: {
    flex: 1,
    gap: 2,
  },
  modalEyebrow: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wider,
  },
  modalName: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  modalPoints: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  modalDescription: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
  },
  modalProgressBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  modalProgressLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  modalProgressValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  modalStatusPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  modalStatusText: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wider,
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  modalCloseBtnPressed: { opacity: 0.6 },
  modalCloseLabel: {
    color: colors.accentGoldGlow,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
