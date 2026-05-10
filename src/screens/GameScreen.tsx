import React, { useCallback, useEffect, useMemo } from 'react';
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
import { useGameStore } from '@/game/state/useGameStore';
import { useProgressStore } from '@/game/state/useProgressStore';
import { calculateScore, calculateStars, calculateXP, formatDifficulty } from '@/game/engine';
import { leaderboardService } from '@/services/social/leaderboardService';
import { scoreSubmissionService } from '@/services/supabase';
import { enqueueLevelScore } from '@/game/sync/pendingSubmissionsQueue';
import { gameCenterService } from '@/services/social/gameCenterService';
import { campaign } from '@/game/modes/campaign';
import { getLevelById, nextLevelId } from '@/game/content/levels';
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

function GameScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const route = useRoute<RootRouteProp<'Game'>>();
  const { levelId, challengeContext } = route.params;

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
    // For a completed puzzle the player has filled exactly `holeCount` cells
    // (the original empties) and — because completion is now solution-aware
    // — every one of them matches the solution. Givens (`81 − holeCount`)
    // are not "placements" the player gets points for.
    const correctPlacements = a.puzzle.holeCount;
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
      // Bump streak on every successful level completion. The store
      // field is named `cleanRun` for historical reasons — it used
      // to require 0 mistakes AND 0 hints to count, but that was an
      // overly strict definition (1 mistake erased a 9-level streak).
      // Streak now represents "consecutive levels cleared", which
      // matches what players intuitively expect. Crown qualification
      // (which is a separate game concept) still requires the
      // perfect criteria via calculateStars in scoring.ts.
      cleanRun: true,
      nextLevelId: nextId,
    });
    // Local mock leaderboard (kept for offline/visual continuity).
    void leaderboardService.submitLocalScore({
      leaderboardId: `campaign.${a.level.worldId}.${a.level.id}`,
      levelId: a.level.id,
      seed: a.puzzle.seed,
      score: breakdown.total,
      time: elapsedSec,
      mistakes: a.mistakes,
      hintsUsed: a.hintsUsed,
      moveCount: a.puzzle.holeCount,
      timestamp: Date.now(),
    });
    // Cloud submission (fire-and-forget; enqueue on failure).
    const cloudPayload = {
      levelId: a.level.id,
      puzzleSeed: a.puzzle.seed,
      score: breakdown.total,
      timeSeconds: elapsedSec,
      mistakes: a.mistakes,
      hints: a.hintsUsed,
      stars: stars.stars,
      crown: stars.crown,
      moveCount: a.puzzle.holeCount,
    };
    void scoreSubmissionService.submitLevelScore(cloudPayload).catch(() => {
      enqueueLevelScore(cloudPayload);
    });
    // Game Center coexistence (best-effort).
    if (gameCenterService.isAuthenticated()) {
      void gameCenterService
        .submitScore(`campaign.${a.level.worldId}.${a.level.id}`, breakdown.total)
        .catch(() => undefined);
    }

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
      challengeContext,
    });
  }, [status, navigation, challengeContext]);

  // Hooks must be declared before any conditional return — `togglePause`
  // moved up here so the React hooks rule is satisfied even when the
  // level-not-found branch renders early below.
  const togglePause = useCallback(() => {
    const cur = useGameStore.getState();
    if (!cur.active) return;
    if (cur.active.status === 'playing') cur.pauseSession();
    else if (cur.active.status === 'paused') cur.resumeSession();
  }, []);

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
      <TopBar
        title={`Level ${level.index} · ${formatDifficulty(level.difficulty)}`}
        rightSlot={
          status !== 'won' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={status === 'paused' ? 'Resume' : 'Pause'}
              onPress={togglePause}
              style={styles.topBarButton}
              hitSlop={8}
            >
              <Text style={styles.topBarButtonText}>
                {status === 'paused' ? '▶' : 'Ⅱ'}
              </Text>
            </Pressable>
          ) : null
        }
      />
      {challengeContext ? (
        <ChallengeBanner
          challengerName={challengeContext.challengerName}
          challengerAvatarUrl={null}
          challengerScore={challengeContext.challengerScore}
          challengerTimeSeconds={challengeContext.challengerTimeSeconds}
        />
      ) : null}
      <View style={styles.statusRow}>
        <Stat label="Time" value={formatTime(elapsedMs)} />
        <Stat label="Mistakes" value={`${mistakes}`} accent={mistakes > 0 ? colors.mistake : undefined} />
        <Stat label="Streak" value={`${streak}`} />
        <Stat label="Regions" value={`${totalCompletions}`} />
      </View>

      <View style={styles.boardWrap}>
        <View style={styles.boardStack}>
          <SudokuBoard size={layout.boardMaxWidth} />
          <EffectsLayer boardSize={layout.boardMaxWidth} />
          <CompletionOverlay />
          {status === 'paused' ? <PausedScrim onResume={togglePause} /> : null}
        </View>
      </View>

      <View style={styles.padWrap}>
        <NumberPad disabled={status !== 'playing'} />
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
        <Text style={styles.pausedEyebrow}>PAUSED</Text>
        <Text style={styles.pausedTitle}>Take a breath</Text>
        <Text style={styles.pausedBody}>
          Your timer is on hold. Tap Resume when you&apos;re ready.
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
    // Darker scrim than the previous overlay so the busy board recedes
    // and the panel reads first.
    backgroundColor: 'rgba(7, 11, 23, 0.74)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  pausedPanel: {
    // Glass card centered inside the scrim. The opaque-ish navy fill +
    // border + shadow ensures even the body copy is comfortably readable
    // regardless of what's on the board behind it.
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
    // `text` (not `textMuted`) so the body sits comfortably above the
    // 60% AA bar even when the board behind has bright digits.
    color: colors.text,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  pausedCta: {
    marginTop: spacing.base,
    minWidth: 180,
  },
});
