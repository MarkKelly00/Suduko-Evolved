import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { CurrencyPill } from '@/components/ui/CurrencyPill';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useProgressStore } from '@/game/state/useProgressStore';
import { WORLD_1_LEVELS } from '@/game/content/levels';
import { colors, fontSize, fontWeight, letterSpacing, spacing } from '@/theme';

function ProfileScreen() {
  const totalXP = useProgressStore((s) => s.totalXP);
  const currentStreak = useProgressStore((s) => s.currentStreak);
  const levels = useProgressStore((s) => s.levels);
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds);
  const timeTrialBests = useProgressStore((s) => s.timeTrialBests);

  const totalStars = Object.values(levels).reduce((sum, e) => sum + e.stars, 0);
  const crowns = Object.values(levels).filter((e) => e.crown).length;
  const totalLevels = WORLD_1_LEVELS.length;
  const progress = completedLevelIds.length / totalLevels;
  const sprintBest = timeTrialBests['sprint-3min'];

  return (
    <ScreenBackground>
      <TopBar title="Profile" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ProgressRing
            progress={progress}
            size={120}
            label={`${completedLevelIds.length}/${totalLevels}`}
            caption="cleared"
          />
          <View style={styles.pillsColumn}>
            <CurrencyPill label="XP" value={totalXP} icon="✦" />
            <CurrencyPill label="streak" value={currentStreak} icon="✺" />
          </View>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Stars &amp; Crowns</Text>
          <View style={styles.statsRow}>
            <Stat label="Stars" value={`${totalStars}/${totalLevels * 3}`} />
            <Stat label="Crowns" value={`${crowns}`} />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Time Trial</Text>
          <View style={styles.statsRow}>
            <Stat label="Best Score" value={`${sprintBest?.score ?? 0}`} />
            <Stat label="Best Time (s)" value={`${sprintBest?.time ?? 0}`} />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Friends</Text>
          <Text style={styles.placeholder}>
            Friend leaderboards arrive in a future update — Game Center hooks are scaffolded.
          </Text>
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  pillsColumn: {
    gap: spacing.sm,
  },
  card: {
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
  },
});
