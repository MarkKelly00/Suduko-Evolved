import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useAuthStore } from '@/game/state/useAuthStore';
import {
  matchmakingService,
  duelInviteService,
} from '@/services/duel';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';
import { hapticsService } from '@/services/haptics/hapticsService';

const POLL_INTERVAL_MS = 2_500;
const MAX_WAIT_MS = 90_000;

type Phase =
  | { kind: 'searching'; secondsElapsed: number }
  | { kind: 'matched'; roomId: string; puzzleSeed: string; startAt: string }
  | { kind: 'in_active_duel'; roomId: string }
  | { kind: 'timeout' }
  | { kind: 'error'; message: string };

/**
 * Matchmaking entry. Joins the queue server-side (atomic match-or-enqueue),
 * polls our own queue row for a `room_id` once another player joins (RLS
 * lets us see only our own queue rows), and routes to the lobby once we're
 * matched.
 *
 * Cancellation is destructive — we mark the queue row cancelled before
 * leaving so we don't steal a future match for someone else.
 */
export default function MatchmakingScreen() {
  const route = useRoute<RootRouteProp<'Matchmaking'>>();
  const navigation = useNavigation<RootStackNavigation>();
  const me = useAuthStore((s) => s.profile);
  const [phase, setPhase] = useState<Phase>({ kind: 'searching', secondsElapsed: 0 });
  const startedAtRef = useRef<number>(Date.now());
  const cancelledRef = useRef(false);

  // Kick off: enter queue or take an immediate match.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await matchmakingService.joinMatchmaking(route.params.mode);
        if (cancelled) return;
        if (result.status === 'matched') {
          setPhase({
            kind: 'matched',
            roomId: result.roomId,
            puzzleSeed: result.puzzleSeed,
            startAt: result.startAt,
          });
        } else if (result.status === 'in_active_duel') {
          setPhase({ kind: 'in_active_duel', roomId: result.roomId });
        } else {
          // searching — poll begins below
        }
      } catch (err) {
        if (!cancelled) {
          setPhase({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Could not join queue',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params.mode]);

  // Poll our own queue row for a match landed by an opponent joining.
  useEffect(() => {
    if (phase.kind !== 'searching' || !me) return;
    const interval = setInterval(async () => {
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed > MAX_WAIT_MS) {
        if (cancelledRef.current) return;
        clearInterval(interval);
        setPhase({ kind: 'timeout' });
        return;
      }
      setPhase({ kind: 'searching', secondsElapsed: Math.floor(elapsed / 1000) });
      try {
        const roomId = await matchmakingService.getActiveMatchmakingRoom(
          me.id,
          route.params.mode,
        );
        if (roomId && !cancelledRef.current) {
          // Re-fetch full join payload would be ideal — but the queue row
          // already has the room id and the lobby fetches the rest.
          clearInterval(interval);
          navigateToLobby(roomId);
        }
      } catch {
        // Transient — keep polling.
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind, me?.id, route.params.mode]);

  // Auto-advance once we have a confirmed match.
  useEffect(() => {
    if (phase.kind === 'matched') {
      hapticsService.success();
      navigation.replace('DuelLobby', {
        roomId: phase.roomId,
        puzzleSeed: phase.puzzleSeed,
        mode: route.params.mode,
        startAt: phase.startAt,
      });
    } else if (phase.kind === 'in_active_duel') {
      navigation.replace('DuelLobby', {
        roomId: phase.roomId,
        puzzleSeed: '',
        mode: route.params.mode,
        startAt: new Date().toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind]);

  const navigateToLobby = async (roomId: string) => {
    // We need the puzzle_seed and start_at — fetch them once.
    try {
      const { duelService } = await import('@/services/duel');
      const bundle = await duelService.getDuelRoom(roomId);
      if (!bundle) return;
      navigation.replace('DuelLobby', {
        roomId,
        puzzleSeed: bundle.room.puzzle_seed,
        mode: route.params.mode,
        startAt: bundle.room.start_at ?? new Date().toISOString(),
      });
    } catch (err) {
      setPhase({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not load duel',
      });
    }
  };

  const cancelAndLeave = async () => {
    cancelledRef.current = true;
    try {
      await matchmakingService.cancelMatchmaking(route.params.mode);
    } catch {
      // ignore — best effort
    }
    navigation.goBack();
  };

  const inviteFriendInstead = async () => {
    cancelledRef.current = true;
    try {
      await matchmakingService.cancelMatchmaking(route.params.mode);
      const link = await duelInviteService.createDuelLink(route.params.mode);
      const { Share } = await import('react-native');
      await Share.share({
        message: `Race me on Sudoku Evolved — ${link.shareUrl}`,
        url: link.shareUrl,
      });
      navigation.goBack();
    } catch {
      navigation.goBack();
    }
  };

  return (
    <ScreenBackground>
      <TopBar title="Finding a rival" />
      <View style={styles.body}>
        <GlassCard style={styles.card}>
          {phase.kind === 'searching' ? (
            <>
              <ActivityIndicator color={colors.accentGold} size="large" />
              <Text style={styles.headline}>Finding a rival…</Text>
              <Text style={styles.body2}>
                Same grid. Same clock. {Math.max(0, Math.floor(phase.secondsElapsed))}s
                {' '}elapsed.
              </Text>
            </>
          ) : phase.kind === 'matched' ? (
            <>
              <ActivityIndicator color={colors.accentGold} size="large" />
              <Text style={styles.headline}>Logic duel starting…</Text>
              <Text style={styles.body2}>Connecting both players.</Text>
            </>
          ) : phase.kind === 'in_active_duel' ? (
            <>
              <Text style={styles.headline}>Already in a duel</Text>
              <Text style={styles.body2}>
                You have an active duel — taking you back to it.
              </Text>
            </>
          ) : phase.kind === 'timeout' ? (
            <>
              <Text style={styles.headline}>No rivals right now</Text>
              <Text style={styles.body2}>
                Try again in a moment, run a solo sprint while you wait, or
                share an invite link.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.headline}>Couldn’t connect</Text>
              <Text style={styles.body2}>{phase.message}</Text>
            </>
          )}
        </GlassCard>

        <View style={styles.actions}>
          {phase.kind === 'searching' ? (
            <>
              <PremiumButton
                label="Invite a friend instead"
                variant="secondary"
                onPress={inviteFriendInstead}
              />
              <Pressable onPress={cancelAndLeave} hitSlop={12}>
                <Text style={styles.cancel}>Cancel matchmaking</Text>
              </Pressable>
            </>
          ) : phase.kind === 'timeout' || phase.kind === 'error' ? (
            <>
              <PremiumButton
                label="Try again"
                variant="primary"
                onPress={() => {
                  startedAtRef.current = Date.now();
                  cancelledRef.current = false;
                  setPhase({ kind: 'searching', secondsElapsed: 0 });
                  void matchmakingService
                    .joinMatchmaking(route.params.mode)
                    .catch(() => undefined);
                }}
              />
              <PremiumButton
                label="Share invite link"
                variant="secondary"
                onPress={inviteFriendInstead}
              />
              <PremiumButton
                label="Back"
                variant="ghost"
                onPress={() => navigation.goBack()}
              />
            </>
          ) : null}
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.base,
  },
  headline: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    textAlign: 'center',
  },
  body2: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: fontSize.sm * 1.45,
  },
  actions: {
    gap: spacing.sm,
  },
  cancel: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
