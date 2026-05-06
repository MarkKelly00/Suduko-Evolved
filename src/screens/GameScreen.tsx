import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { SudokuBoard } from '@/components/board/SudokuBoard';
import { NumberPad } from '@/components/board/NumberPad';
import { CompletionOverlay } from '@/components/board/CompletionOverlay';
import { useGameStore } from '@/game/state/useGameStore';
import { useProgressStore } from '@/game/state/useProgressStore';
import { calculateScore, calculateStars, calculateXP } from '@/game/engine';
import { campaign } from '@/game/modes/campaign';
import { getLevelById, nextLevelId } from '@/game/content/levels';
import { colors, fontSize, fontWeight, letterSpacing, layout, spacing } from '@/theme';
import { formatTime } from '@/utils/formatTime';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

function GameScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const route = useRoute<RootRouteProp<'Game'>>();
  const { levelId } = route.params;

  const active = useGameStore((s) => s.active);
  const status = useGameStore((s) => s.active?.status ?? 'playing');
  const elapsedMs = useGameStore((s) => s.active?.elapsedMs ?? 0);
  const mistakes = useGameStore((s) => s.active?.mistakes ?? 0);
  const streak = useGameStore((s) => s.active?.streak ?? 0);
  const tallies = useGameStore((s) => s.active?.tallies ?? null);

  const level = useMemo(() => getLevelById(levelId), [levelId]);

  // Start a session if the navigated levelId doesn't match the active one
  // (e.g. user came from Results → Replay → ourselves).
  useEffect(() => {
    if (!level) return;
    if (!active || active.level.id !== level.id) {
      campaign.startLevel(level.id);
    }
    return () => {
      // When leaving via back button, abandon the session so the timer
      // stops. Going to Results uses navigation.replace which also unmounts
      // this screen.
      const current = useGameStore.getState().active;
      if (current && current.status !== 'won') {
        useGameStore.getState().abandonSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level?.id]);

  // When status transitions to 'won', compute the score & navigate.
  useEffect(() => {
    if (status !== 'won') return;
    const a = useGameStore.getState().active;
    if (!a) return;
    const elapsedSec = Math.floor(a.elapsedMs / 1000);
    const correctPlacements = 81 - a.puzzle.holeCount; // every empty got filled correctly
    const breakdown = calculateScore({
      correctPlacements,
      tallies: a.tallies,
      mistakes: a.mistakes,
      hintsUsed: a.hintsUsed,
      elapsedSeconds: elapsedSec,
      targetTimeSeconds: a.level.targetTimeSeconds,
      streak: a.bestStreak,
    });
    const stars = calculateStars({
      scoreTotal: breakdown.total,
      level: a.level,
      mistakes: a.mistakes,
      hintsUsed: a.hintsUsed,
      elapsedSeconds: elapsedSec,
    });
    const xp = calculateXP({ scoreTotal: breakdown.total, stars: stars.stars, crown: stars.crown });

    const nextId = nextLevelId(a.level.id) ?? undefined;
    useProgressStore.getState().recordResult({
      levelId: a.level.id,
      stars: stars.stars,
      crown: stars.crown,
      score: breakdown.total,
      time: elapsedSec,
      xp,
      cleanRun: a.mistakes === 0 && a.hintsUsed === 0,
      nextLevelId: nextId,
    });

    useGameStore.getState().endSession();

    navigation.replace('Results', {
      levelId: a.level.id,
      score: breakdown.total,
      stars: stars.stars,
      crown: stars.crown,
      timeSeconds: elapsedSec,
      mistakes: a.mistakes,
      hintsUsed: a.hintsUsed,
      xp,
    });
  }, [status, navigation]);

  if (!level) {
    return (
      <ScreenBackground>
        <TopBar title="Level not found" />
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{`Level "${levelId}" doesn’t exist.`}</Text>
        </View>
      </ScreenBackground>
    );
  }

  const totalCompletions =
    (tallies?.rowsCompleted ?? 0) +
    (tallies?.colsCompleted ?? 0) +
    (tallies?.boxesCompleted ?? 0);

  return (
    <ScreenBackground>
      <TopBar title={`Level ${level.index} · ${level.difficulty}`} />
      <View style={styles.statusRow}>
        <Stat label="Time" value={formatTime(elapsedMs)} />
        <Stat label="Mistakes" value={`${mistakes}`} accent={mistakes > 0 ? colors.mistake : undefined} />
        <Stat label="Streak" value={`${streak}`} />
        <Stat label="Regions" value={`${totalCompletions}`} />
      </View>

      <View style={styles.boardWrap}>
        <View style={styles.boardStack}>
          <SudokuBoard size={layout.boardMaxWidth} />
          <CompletionOverlay />
        </View>
      </View>

      <View style={styles.padWrap}>
        <NumberPad disabled={status !== 'playing'} />
      </View>
    </ScreenBackground>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent ? { color: accent } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default GameScreen;

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  boardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  boardStack: {
    position: 'relative',
  },
  padWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
