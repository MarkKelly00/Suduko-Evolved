import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { SudokuBoard } from '@/components/board/SudokuBoard';
import { NumberPad } from '@/components/board/NumberPad';
import { CompletionOverlay } from '@/components/board/CompletionOverlay';
import { EffectsLayer } from '@/components/effects/EffectsLayer';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { ChallengeBanner } from '@/components/friends/ChallengeBanner';
import {
  selectTimeRemainingMs,
  useGameStore,
} from '@/game/state/useGameStore';
import { useProgressStore } from '@/game/state/useProgressStore';
import { calculateScore, calculateStars, calculateXP } from '@/game/engine';
import {
  dailySeed,
  deterministicSprintSeed,
  getTimeTrialMode,
  synthesizeSprintLevel,
} from '@/game/modes/timeTrial';
import { leaderboardService } from '@/services/social/leaderboardService';
import { scoreSubmissionService } from '@/services/supabase';
import { enqueueTimeTrialScore } from '@/game/sync/pendingSubmissionsQueue';
import { gameCenterService } from '@/services/social/gameCenterService';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  layout,
  radius,
  spacing,
} from '@/theme';
import { formatTime } from '@/utils/formatTime';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

/**
 * Time Trial game screen. Same board + number pad + completion VFX as the
 * campaign, but driven by a downward-counting clock. The session ends when:
 *   • the player completes the puzzle (`status === 'won'`) — best case;
 *   • the timer expires (`status === 'timedOut'`) — partial credit.
 *
 * In both cases we tally the final score with the campaign scoring pipeline
 * (re-using its tested behavior), persist a per-mode best, fire a
 * leaderboard submission stub for future Game Center wiring, and route to
 * the existing Results screen with `mode: 'sprint'` so the copy/CTAs
 * change without forking the screen.
 */
function TimeTrialGameScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const route = useRoute<RootRouteProp<'TimeTrialGame'>>();
  const { modeId, challengeContext } = route.params;
  const mode = useMemo(() => getTimeTrialMode(modeId), [modeId]);

  const status = useGameStore((s) => s.active?.status ?? 'playing');
  const elapsedMs = useGameStore((s) => s.active?.elapsedMs ?? 0);
  const timeRemainingMs = useGameStore(selectTimeRemainingMs);
  const mistakes = useGameStore((s) => s.active?.mistakes ?? 0);
  const streak = useGameStore((s) => s.active?.streak ?? 0);
  const tallies = useGameStore((s) => s.active?.tallies ?? null);

  // Each mount picks a fresh seed (or the daily one). Stored in a ref so
  // the React effect below doesn't re-roll between renders.
  const sessionRef = useRef<{ seed: string; runStartedAt: number } | null>(null);

  useEffect(() => {
    if (!mode) return;
    if (sessionRef.current == null) {
      // Challenge plays use the challenger's seed so both opponents see the
      // same puzzle. Otherwise: daily seed for daily mode, fresh deterministic
      // seed otherwise.
      const seed =
        challengeContext?.puzzleSeed ??
        (mode.daily ? dailySeed() : deterministicSprintSeed(mode.id, Date.now()));
      sessionRef.current = { seed, runStartedAt: Date.now() };
    }
    const { seed } = sessionRef.current;
    const level = synthesizeSprintLevel(mode, seed);
    useGameStore.getState().startSprintSession({
      modeId: mode.id,
      level,
      durationSeconds: mode.durationSeconds,
    });
    return () => {
      // Leaving without finishing = abandon. Same semantics as the campaign:
      // the timer interval shuts off, no result is recorded.
      const cur = useGameStore.getState().active;
      if (cur && cur.status === 'playing') useGameStore.getState().abandonSession();
    };
  }, [mode, challengeContext?.puzzleSeed]);

  // Terminal state → finalize, persist, navigate.
  useEffect(() => {
    if (status !== 'won' && status !== 'timedOut') return;
    const a = useGameStore.getState().active;
    if (!a || a.modeId == null) return;

    const elapsedSec = Math.floor(a.elapsedMs / 1000);
    const cleared = status === 'won';
    // For sprint scoring: count player placements as cells filled (whether
    // correct or not is folded in via tallies + mistakes). For a partial
    // run we approximate placements as `holeCount − empties remaining`.
    const remainingEmpties = countEmpties(a.grid);
    const correctPlacements = Math.max(0, a.puzzle.holeCount - remainingEmpties - a.mistakes);
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

    useProgressStore.getState().recordTimeTrialBest(a.modeId, breakdown.total, elapsedSec);
    void leaderboardService.submitLocalScore({
      leaderboardId: `tt.${a.modeId}`,
      levelId: a.level.id,
      seed: a.puzzle.seed,
      score: breakdown.total,
      time: elapsedSec,
      mistakes: a.mistakes,
      hintsUsed: a.hintsUsed,
      moveCount: 81 - remainingEmpties - (81 - a.puzzle.holeCount),
      timestamp: Date.now(),
    });
    const ttCloudPayload = {
      modeId: a.modeId,
      puzzleSeed: a.puzzle.seed,
      score: breakdown.total,
      timeSeconds: elapsedSec,
      mistakes: a.mistakes,
      hints: a.hintsUsed,
      moveCount: 81 - remainingEmpties - (81 - a.puzzle.holeCount),
      periodKey: '',
    };
    void scoreSubmissionService.submitTimeTrialScore(ttCloudPayload).catch(() => {
      enqueueTimeTrialScore(ttCloudPayload);
    });
    if (gameCenterService.isAuthenticated()) {
      void gameCenterService
        .submitScore(`tt.${a.modeId}`, breakdown.total)
        .catch(() => undefined);
    }

    useGameStore.getState().endSession();
    navigation.replace('Results', {
      levelId: a.level.id,
      score: breakdown.total,
      stars: stars.stars,
      crown: cleared && stars.crown,
      timeSeconds: elapsedSec,
      mistakes: a.mistakes,
      hintsUsed: a.hintsUsed,
      xp,
      mode: 'sprint',
      sprintModeId: a.modeId,
      sprintSeed: a.puzzle.seed,
      sprintCleared: cleared,
      challengeContext,
    });
  }, [status, navigation, challengeContext]);

  const togglePause = useCallback(() => {
    const cur = useGameStore.getState();
    if (!cur.active) return;
    if (cur.active.status === 'playing') cur.pauseSession();
    else if (cur.active.status === 'paused') cur.resumeSession();
  }, []);

  if (!mode) {
    return (
      <ScreenBackground>
        <TopBar title="Time Trial" />
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{`Mode "${modeId}" not found.`}</Text>
        </View>
      </ScreenBackground>
    );
  }

  const totalCompletions =
    (tallies?.rowsCompleted ?? 0) +
    (tallies?.colsCompleted ?? 0) +
    (tallies?.boxesCompleted ?? 0);

  const remaining = timeRemainingMs ?? mode.durationSeconds * 1000;
  const lowTime = remaining <= 30_000;
  const veryLowTime = remaining <= 10_000;

  return (
    <ScreenBackground>
      <TopBar
        title={mode.name}
        rightSlot={
          status === 'playing' || status === 'paused' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={status === 'paused' ? 'Resume' : 'Pause'}
              onPress={togglePause}
              style={styles.topBarButton}
              hitSlop={8}
            >
              <Text style={styles.topBarButtonText}>{status === 'paused' ? '▶' : 'Ⅱ'}</Text>
            </Pressable>
          ) : null
        }
      />
      {challengeContext ? (
        <ChallengeBanner
          challengerName={challengeContext.challengerName}
          challengerAvatarUrl={challengeContext.challengerAvatarUrl ?? null}
          challengerScore={challengeContext.challengerScore}
          challengerTimeSeconds={challengeContext.challengerTimeSeconds}
        />
      ) : null}
      <View style={styles.statusRow}>
        <Stat
          label="Time Left"
          value={formatTime(remaining)}
          accent={veryLowTime ? colors.mistake : lowTime ? colors.warning : undefined}
        />
        <Stat label="Score Streak" value={`${streak}`} />
        <Stat
          label="Mistakes"
          value={`${mistakes}`}
          accent={mistakes > 0 ? colors.mistake : undefined}
        />
        <Stat label="Regions" value={`${totalCompletions}`} />
      </View>

      <View style={styles.boardWrap}>
        <View style={styles.boardStack}>
          <SudokuBoard size={layout.boardMaxWidth} />
          <EffectsLayer boardSize={layout.boardMaxWidth} />
          <CompletionOverlay />
          {status === 'paused' ? (
            <PausedScrim onResume={togglePause} />
          ) : null}
        </View>
      </View>

      <View style={styles.padWrap}>
        <NumberPad disabled={status !== 'playing'} />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          Elapsed {formatTime(elapsedMs)} · Seed {mode.daily ? 'daily' : 'rolling'}
        </Text>
      </View>
    </ScreenBackground>
  );
}

function PausedScrim({ onResume }: { onResume: () => void }) {
  return (
    <View
      style={styles.pausedScrim}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.pausedPanel}>
        <Text style={styles.pausedEyebrow}>SPRINT PAUSED</Text>
        <Text style={styles.pausedTitle}>Catch your breath</Text>
        <Text style={styles.pausedBody}>
          The clock is on hold. Tap Resume to keep racing.
        </Text>
        <PremiumButton
          label="Resume"
          onPress={onResume}
          variant="primary"
          compact
          style={styles.pausedCta}
        />
      </View>
    </View>
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

function countEmpties(grid: (number | null)[][]): number {
  let n = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] == null) n++;
    }
  }
  return n;
}

export default TimeTrialGameScreen;

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  stat: { alignItems: 'center', flex: 1 },
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
  boardStack: { position: 'relative' },
  padWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  metaRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    alignItems: 'center',
  },
  metaText: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wide,
  },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorText: { color: colors.textMuted, fontSize: fontSize.base, textAlign: 'center' },
  topBarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarButtonText: {
    color: colors.accentGold,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginTop: -2,
  },
  pausedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 11, 23, 0.74)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  pausedPanel: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(10, 15, 30, 0.92)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
    alignItems: 'center',
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
  },
  pausedEyebrow: {
    color: colors.accentGoldDim,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    fontWeight: fontWeight.semibold,
  },
  pausedTitle: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    textAlign: 'center',
  },
  pausedBody: {
    color: colors.text,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  pausedCta: { marginTop: spacing.base, minWidth: 180 },
});
