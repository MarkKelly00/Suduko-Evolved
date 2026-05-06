import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { TIME_TRIAL_MODES } from '@/game/modes/timeTrial';
import { dailyPuzzle } from '@/game/modes/dailyPuzzle';
import { useProgressStore } from '@/game/state/useProgressStore';
import { colors, fontSize, fontWeight, letterSpacing, spacing } from '@/theme';
import { formatDuration } from '@/utils/formatTime';
import type { RootStackNavigation } from '@/app/navigation/routes';

function TimeTrialScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const bests = useProgressStore((s) => s.timeTrialBests);
  const todaySeed = dailyPuzzle.seedForToday();

  const handleStart = (modeId: string) => {
    navigation.navigate('TimeTrialGame', { modeId });
  };

  return (
    <ScreenBackground>
      <TopBar title="Time Trial" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          Race the clock. Streaks, combos, and clean play multiply your score.
        </Text>

        {TIME_TRIAL_MODES.map((mode) => {
          const best = bests[mode.id];
          return (
            <GlassCard key={mode.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.modeTitle}>{mode.name}</Text>
                <Text style={styles.modeDuration}>{mode.durationSeconds}s</Text>
              </View>
              <Text style={styles.modeDescription}>
                {mode.daily
                  ? `Today's seeded run · ${todaySeed}`
                  : 'Random seed each run.'}
              </Text>
              <View style={styles.statsRow}>
                <Stat
                  label="Best Score"
                  value={best ? best.score.toLocaleString() : '—'}
                />
                <Stat
                  label="Best Time"
                  value={best?.time ? formatDuration(best.time) : '—'}
                />
              </View>
              <PremiumButton
                label={best ? 'Race again' : 'Start sprint'}
                onPress={() => handleStart(mode.id)}
                variant="primary"
                compact
                style={styles.cta}
              />
            </GlassCard>
          );
        })}
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

export default TimeTrialScreen;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  intro: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    marginBottom: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  modeDuration: {
    color: colors.accentGold,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.wide,
  },
  modeDescription: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  cta: {
    marginTop: spacing.sm,
  },
});
