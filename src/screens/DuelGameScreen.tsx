import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { SudokuBoard } from '@/components/board/SudokuBoard';
import { NumberPad } from '@/components/board/NumberPad';
import { CompletionOverlay } from '@/components/board/CompletionOverlay';
import { EffectsLayer } from '@/components/effects/EffectsLayer';
import { OpponentRail } from '@/components/duel/OpponentRail';
import {
  selectTimeRemainingMs,
  useGameStore,
} from '@/game/state/useGameStore';
import { calculateScore, calculateStars } from '@/game/engine';
import { synthesizeDuelLevel } from '@/game/modes/duel';
import { getTimeTrialMode } from '@/game/modes/timeTrial';
import { useAuthStore } from '@/game/state/useAuthStore';
import {
  duelService,
  duelRealtimeService,
  duelSubmissionService,
} from '@/services/duel';
import { validateDuelAttempt } from '@/game/sync/duelAttemptValidator';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  layout,
  spacing,
} from '@/theme';
import { formatTime } from '@/utils/formatTime';
import { hapticsService } from '@/services/haptics/hapticsService';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

const HEARTBEAT_INTERVAL_MS = 1500;
const BROADCAST_INTERVAL_MS = 1000;

interface OpponentState {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
  score: number;
  progressPercent: number;
  completedUnits: { rows?: number; cols?: number; boxes?: number };
  finished: boolean;
  lastSeenAt: number;
}

/**
 * Live duel screen. Mirrors TimeTrialGameScreen for the player's board
 * but adds:
 *   - OpponentRail subscribed to duel_participants UPDATEs and broadcast
 *     progress events.
 *   - Heartbeat publisher (1.5s server, 1s broadcast) reporting score &
 *     progress.
 *   - Duel attempt submission via submit_duel_attempt RPC instead of
 *     time_trial_scores.
 *   - App-state tracking for app_background_count anti-cheat metadata.
 */
export default function DuelGameScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const route = useRoute<RootRouteProp<'DuelGame'>>();
  const { roomId, puzzleSeed, mode } = route.params;
  const me = useAuthStore((s) => s.profile);
  const modeMeta = useMemo(() => getTimeTrialMode(mode), [mode]);

  const status = useGameStore((s) => s.active?.status ?? 'playing');
  const elapsedMs = useGameStore((s) => s.active?.elapsedMs ?? 0);
  const timeRemainingMs = useGameStore(selectTimeRemainingMs);
  const mistakes = useGameStore((s) => s.active?.mistakes ?? 0);
  const tallies = useGameStore((s) => s.active?.tallies ?? null);

  const [opponent, setOpponent] = useState<OpponentState | null>(null);
  const submittedRef = useRef(false);
  const broadcastChanRef = useRef<ReturnType<
    typeof duelRealtimeService.openProgressBroadcast
  > | null>(null);
  const appBackgroundCountRef = useRef(0);
  const reconnectCountRef = useRef(0);

  // Start the sprint session bound to the server's seed.
  //
  // Belt-and-braces: clear any stale `active` from a previous duel
  // BEFORE creating the new session. Otherwise the terminal-submission
  // effect below could fire on its initial run with the previous
  // duel's "won"/"timedOut" status still in store, and submit that
  // old score against the NEW roomId — the cause of the famous
  // "phantom rematch" rooms that completed in 6–9 seconds as a 710/710
  // draw (see commits 120c02a + this fix's commit message). The
  // guard inside the terminal-submission effect catches the same
  // race; we clear here for defence-in-depth.
  useEffect(() => {
    if (!modeMeta) return;
    const level = synthesizeDuelLevel(mode, puzzleSeed);
    if (!level) return;
    useGameStore.setState({ active: null });
    useGameStore.getState().startSprintSession({
      modeId: mode,
      level,
      durationSeconds: modeMeta.durationSeconds,
    });
    return () => {
      const cur = useGameStore.getState().active;
      if (cur && cur.status === 'playing') useGameStore.getState().abandonSession();
    };
  }, [mode, puzzleSeed, modeMeta]);

  // Subscribe to opponent participant updates.
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    void (async () => {
      const bundle = await duelService.getDuelRoom(roomId);
      if (cancelled || !bundle) return;
      const opp = bundle.participants.find((p) => p.user_id !== me.id);
      if (opp) {
        setOpponent({
          userId: opp.user_id,
          displayName: opp.profile?.display_name ?? null,
          avatarUrl: opp.profile?.avatar_url ?? null,
          username: opp.profile?.username ?? null,
          score: opp.current_score,
          progressPercent: opp.progress_percent,
          completedUnits:
            (opp.completed_units as OpponentState['completedUnits']) ?? {},
          finished: opp.status === 'finished',
          lastSeenAt: new Date(opp.last_seen_at).getTime(),
        });
      }
    })();
    const unsub = duelRealtimeService.subscribeParticipants(roomId, (row) => {
      if (row.user_id === me.id) return; // ignore self echoes
      setOpponent((prev) =>
        prev
          ? {
              ...prev,
              score: row.current_score,
              progressPercent: row.progress_percent,
              completedUnits:
                (row.completed_units as OpponentState['completedUnits']) ??
                prev.completedUnits,
              finished: row.status === 'finished',
              lastSeenAt: new Date(row.last_seen_at).getTime(),
            }
          : prev,
      );
      if (row.status === 'finished') hapticsService.selection();
    });
    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, me?.id]);

  // Broadcast channel for high-frequency progress pings.
  useEffect(() => {
    if (!me) return;
    const chan = duelRealtimeService.openProgressBroadcast(
      roomId,
      me.id,
      (event) => {
        setOpponent((prev) =>
          prev
            ? {
                ...prev,
                score: event.score,
                progressPercent: event.progressPercent,
                completedUnits: event.completedUnits ?? prev.completedUnits,
                finished: event.finished ?? prev.finished,
                lastSeenAt: event.ts,
              }
            : prev,
        );
      },
    );
    broadcastChanRef.current = chan;
    return () => {
      chan.unsubscribe();
      broadcastChanRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, me?.id]);

  // Periodic heartbeat (server) + broadcast.
  useEffect(() => {
    if (!me) return;
    const computeNow = () => {
      const a = useGameStore.getState().active;
      if (!a) return null;
      const elapsedSec = Math.floor(a.elapsedMs / 1000);
      const remainingEmpties = countEmpties(a.grid);
      const correctPlacements = Math.max(
        0,
        a.puzzle.holeCount - remainingEmpties - a.mistakes,
      );
      const breakdown = calculateScore({
        correctPlacements,
        tallies: a.tallies,
        mistakes: a.mistakes,
        hintsUsed: a.hintsUsed,
        elapsedSeconds: elapsedSec,
        targetTimeSeconds: a.level.targetTimeSeconds,
        streak: a.bestStreak,
      });
      const totalCells = a.puzzle.holeCount;
      const filledCells = totalCells - remainingEmpties;
      const progressPercent = totalCells === 0 ? 0 : (filledCells / totalCells) * 100;
      return {
        score: breakdown.total,
        progressPercent,
        completedUnits: {
          rows: a.tallies.rowsCompleted,
          cols: a.tallies.colsCompleted,
          boxes: a.tallies.boxesCompleted,
        },
        mistakes: a.mistakes,
        hints: a.hintsUsed,
      };
    };

    const heartbeat = setInterval(() => {
      const snap = computeNow();
      if (!snap) return;
      void duelSubmissionService.sendDuelHeartbeat({
        roomId,
        score: snap.score,
        progressPercent: snap.progressPercent,
        completedUnits: snap.completedUnits,
      });
    }, HEARTBEAT_INTERVAL_MS);

    const broadcast = setInterval(() => {
      const snap = computeNow();
      if (!snap || !broadcastChanRef.current) return;
      void broadcastChanRef.current.publish({
        userId: me.id,
        score: snap.score,
        progressPercent: snap.progressPercent,
        completedUnits: snap.completedUnits,
        mistakes: snap.mistakes,
        hints: snap.hints,
        finished: false,
        ts: Date.now(),
      });
    }, BROADCAST_INTERVAL_MS);

    return () => {
      clearInterval(heartbeat);
      clearInterval(broadcast);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, me?.id]);

  // Track app background count for anti-cheat metadata.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        appBackgroundCountRef.current += 1;
      } else if (next === 'active') {
        // Treat resume as a reconnect for stats.
        reconnectCountRef.current += 1;
      }
    });
    return () => sub.remove();
  }, []);

  // Terminal status — submit and route to results.
  //
  // CRITICAL: every gate inside this effect reads from `a.status`
  // (the LIVE store value) instead of the captured `status` closure.
  //
  // Why: on rematch, the store's `active.status` from the previous
  // duel is still 'won' at the moment this component first renders,
  // so the closure-captured `status` is 'won' on its very first
  // useEffect fire. The start-session effect above runs FIRST in
  // declaration order, so by the time this effect runs the store
  // ALREADY has the new session (status='playing'), but the closure
  // still says 'won'. My earlier fix (commit 9e220cc) gated on
  // `level.seed === puzzleSeed`, but the start-session effect had
  // also already updated the seed by the time this effect ran —
  // both halves of the guard observed the new session and let the
  // phantom submit through.
  //
  // Reading `a.status` from the store directly closes the loophole:
  // even if the closure says 'won', the live store shows 'playing'
  // for a freshly-started session, so the effect bails.
  //
  // Dep array still includes `status` so re-renders re-fire the
  // effect when the *current* session legitimately transitions to a
  // terminal state.
  useEffect(() => {
    if (submittedRef.current) return;
    const a = useGameStore.getState().active;
    if (!a || !modeMeta) return;
    // Status must be a real terminal in the LIVE store, not the
    // closure-captured value (which can be stale from the previous
    // duel for one render after mount).
    if (a.status !== 'won' && a.status !== 'timedOut') return;
    // Session ownership: mode + seed must match what this screen was
    // navigated with. Belt-and-braces — the status check above
    // already catches the rematch race, but this protects against
    // any future code path that leaves a terminal session in store
    // while a new screen mounts.
    if (a.modeId !== mode || a.level.seed !== puzzleSeed) {
      if (__DEV__) {
        console.warn('[DuelGame] stale active session ignored', {
          screenMode: mode,
          screenSeed: puzzleSeed,
          activeMode: a.modeId,
          activeSeed: a.level.seed,
        });
      }
      return;
    }
    submittedRef.current = true;
    const elapsedSec = Math.floor(a.elapsedMs / 1000);
    const cleared = a.status === 'won';
    const remainingEmpties = countEmpties(a.grid);
    const correctPlacements = Math.max(
      0,
      a.puzzle.holeCount - remainingEmpties - a.mistakes,
    );
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
    const finalGrid: number[] | null = cleared
      ? (a.grid.flat().map((v) => v ?? 0) as number[])
      : null;

    const verdict = validateDuelAttempt(
      {
        puzzleSeed,
        difficulty: a.level.difficulty,
        durationSeconds: modeMeta.durationSeconds,
      },
      {
        score: breakdown.total,
        timeSeconds: elapsedSec,
        mistakes: a.mistakes,
        hints: a.hintsUsed,
        moveCount: a.puzzle.holeCount - remainingEmpties + a.mistakes,
        finalGrid,
      },
    );
    if (__DEV__ && verdict.suspicious) {
      console.warn('[DuelGame] suspicious attempt', verdict.reasons);
    }

    void (async () => {
      try {
        // Final broadcast so the opponent sees the finished badge.
        if (broadcastChanRef.current && me) {
          void broadcastChanRef.current.publish({
            userId: me.id,
            score: breakdown.total,
            progressPercent: 100,
            completedUnits: {
              rows: a.tallies.rowsCompleted,
              cols: a.tallies.colsCompleted,
              boxes: a.tallies.boxesCompleted,
            },
            finished: true,
            ts: Date.now(),
          });
        }
        await duelSubmissionService.submitDuelAttempt({
          roomId,
          score: breakdown.total,
          timeSeconds: elapsedSec,
          mistakes: a.mistakes,
          hints: a.hintsUsed,
          stars: cleared ? stars.stars : null,
          crown: cleared && stars.crown,
          moveCount: a.puzzle.holeCount - remainingEmpties + a.mistakes,
          finalGrid,
          appBackgroundCount: appBackgroundCountRef.current,
          reconnectCount: reconnectCountRef.current,
        });
      } catch (err) {
        if (__DEV__) console.warn('[DuelGame] submit failed', err);
      } finally {
        useGameStore.getState().endSession();
        navigation.replace('DuelResults', { roomId });
      }
    })();
  }, [status, modeMeta, navigation, puzzleSeed, roomId, me]);

  const togglePause = useCallback(() => {
    const cur = useGameStore.getState();
    if (!cur.active) return;
    if (cur.active.status === 'playing') cur.pauseSession();
    else if (cur.active.status === 'paused') cur.resumeSession();
  }, []);

  if (!modeMeta) {
    return (
      <ScreenBackground>
        <TopBar title="Duel" />
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{`Mode "${mode}" not found.`}</Text>
        </View>
      </ScreenBackground>
    );
  }

  const remaining = timeRemainingMs ?? modeMeta.durationSeconds * 1000;
  const lowTime = remaining <= 30_000;
  const veryLowTime = remaining <= 10_000;
  const reconnecting = opponent
    ? Date.now() - opponent.lastSeenAt > 6_000
    : false;

  return (
    <ScreenBackground>
      <TopBar
        title="Logic Duel"
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
      {opponent ? (
        <OpponentRail
          displayName={opponent.displayName}
          avatarUrl={opponent.avatarUrl}
          username={opponent.username}
          progressPercent={opponent.progressPercent}
          score={opponent.score}
          completedUnits={opponent.completedUnits}
          finished={opponent.finished}
          reconnecting={reconnecting}
        />
      ) : null}
      <View style={styles.statusRow}>
        <Stat
          label="Time Left"
          value={formatTime(remaining)}
          accent={veryLowTime ? colors.mistake : lowTime ? colors.warning : undefined}
        />
        <Stat
          label="Mistakes"
          value={`${mistakes}`}
          accent={mistakes > 0 ? colors.mistake : undefined}
        />
        <Stat label="Regions" value={`${(tallies?.rowsCompleted ?? 0) + (tallies?.colsCompleted ?? 0) + (tallies?.boxesCompleted ?? 0)}`} />
      </View>
      <View style={styles.boardWrap}>
        <View style={styles.boardStack}>
          <SudokuBoard size={layout.boardMaxWidth} />
          <EffectsLayer boardSize={layout.boardMaxWidth} />
          <CompletionOverlay />
        </View>
      </View>
      <View style={styles.padWrap}>
        <NumberPad disabled={status !== 'playing'} />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Elapsed {formatTime(elapsedMs)}</Text>
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

function countEmpties(grid: (number | null)[][]): number {
  let n = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r]![c] == null) n++;
    }
  }
  return n;
}

const styles = StyleSheet.create({
  topBarButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  topBarButtonText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  boardWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  boardStack: {
    width: layout.boardMaxWidth,
    height: layout.boardMaxWidth,
    position: 'relative',
  },
  padWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  metaRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  metaText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
