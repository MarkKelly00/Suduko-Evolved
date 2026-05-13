import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/profile/Avatar';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useAuthStore } from '@/game/state/useAuthStore';
import {
  duelService,
  duelRealtimeService,
  duelSubmissionService,
} from '@/services/duel';
import { markDuelReady } from '@/services/duel/duelLobbyReady';
import { getTimeTrialMode } from '@/game/modes/timeTrial';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

/**
 * Pre-game lobby — both players land here after matchmaking succeeds
 * OR after one player redeems an invite link.
 *
 * Countdown sync rule: the countdown is NOT driven by the `start_at`
 * passed via navigation params (that's a placeholder, set to `now + 5s`
 * by the original RPC). Instead:
 *
 *   1. On mount the local player calls `mark_duel_ready` RPC, which
 *      sets their `duel_participants.ready_at = now()`.
 *   2. If BOTH participants now have `ready_at != null`, the RPC also
 *      rewrites `duel_rooms.start_at` to `now + 5s` and bumps status
 *      to 'countdown'. The returned `start_at` is the canonical
 *      timestamp both clients must drive their countdown from.
 *   3. Until both players are ready, the lobby shows "Waiting for
 *      @opponent to join…". A `postgres_changes` subscription on
 *      `duel_participants` (now firing on INSERT too — important for
 *      the second player's row appearing) re-runs the readiness check.
 *
 * Hard cap: if the peer hasn't readied within 60s of mount, we show
 * "Friend didn't make it — try another duel" + a Leave CTA. That's
 * the friendly version of the room's 15-minute expires_at.
 */

const PEER_TIMEOUT_MS = 60_000;

export default function DuelLobbyScreen() {
  const route = useRoute<RootRouteProp<'DuelLobby'>>();
  const navigation = useNavigation<RootStackNavigation>();
  const me = useAuthStore((s) => s.profile);
  const { roomId, puzzleSeed, mode } = route.params;
  const modeMeta = useMemo(() => getTimeTrialMode(mode), [mode]);

  // `effectiveStartAt` is the server-authoritative timestamp the
  // countdown anchors to. Starts as null and is populated by either:
  //   (a) the result of mark_duel_ready (when bothReady becomes true)
  //   (b) the realtime room-state subscription (when the OTHER player
  //       flips bothReady, we read room.start_at from getDuelRoom).
  const [effectiveStartAt, setEffectiveStartAt] = useState<string | null>(null);

  const [bundle, setBundle] = useState<Awaited<
    ReturnType<typeof duelService.getDuelRoom>
  > | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [peerTimedOut, setPeerTimedOut] = useState(false);

  // Lifecycle: fetch the room + mark myself ready on mount.
  // Subscribe to participants so we notice when the OPPONENT readies.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Initial fetch — gives us self/opponent profiles + current ready_at state.
      const initial = await duelService.getDuelRoom(roomId);
      if (cancelled) return;
      setBundle(initial);

      // Mark myself ready (idempotent — no-op if already ready).
      const readyResult = await markDuelReady(roomId);
      if (cancelled) return;
      if (readyResult?.bothReady && readyResult.startAt) {
        setEffectiveStartAt(readyResult.startAt);
      }

      // Re-fetch the bundle so my own ready_at flag is reflected in
      // local state without waiting for the realtime echo.
      const refreshed = await duelService.getDuelRoom(roomId);
      if (!cancelled && refreshed) setBundle(refreshed);
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Subscribe to participant changes — INSERT (second player joined)
  // and UPDATE (their ready_at flipped). On any change, re-fetch the
  // bundle and check whether both are ready.
  useEffect(() => {
    const unsub = duelRealtimeService.subscribeParticipants(roomId, () => {
      void (async () => {
        const refreshed = await duelService.getDuelRoom(roomId);
        if (!refreshed) return;
        setBundle(refreshed);
        const bothReady =
          refreshed.participants.length >= 2 &&
          refreshed.participants.every(
            (p) => (p as { ready_at?: string | null }).ready_at != null,
          );
        if (bothReady && refreshed.room.start_at) {
          setEffectiveStartAt(refreshed.room.start_at);
        }
      })();
    });
    return () => unsub();
  }, [roomId]);

  // Subscribe to room status — if it transitions to 'completed' or
  // 'cancelled' before we get into Game, route directly to results.
  useEffect(() => {
    const unsub = duelRealtimeService.subscribeRoomState(roomId, (room) => {
      if (room.status === 'completed' || room.status === 'cancelled') {
        navigation.replace('DuelResults', { roomId });
      } else if (room.start_at && (room.status === 'countdown' || room.status === 'active')) {
        // Peer-readied path: their mark_duel_ready may have rewritten
        // start_at without our local subscription firing yet. Take the
        // server-canonical start_at directly off the room row.
        setEffectiveStartAt(room.start_at);
      }
    });
    return () => unsub();
  }, [navigation, roomId]);

  // 4Hz countdown — only runs once we have an effectiveStartAt.
  useEffect(() => {
    if (!effectiveStartAt) {
      setCountdown(null);
      return;
    }
    const target = new Date(effectiveStartAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0 && !autoStarted) {
        setAutoStarted(true);
        navigation.replace('DuelGame', { roomId, puzzleSeed, mode });
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [effectiveStartAt, autoStarted, navigation, roomId, puzzleSeed, mode]);

  // Peer-timeout: if effectiveStartAt is still null after 60s, the
  // inviter never showed up (or matchmaking dropped its peer).
  useEffect(() => {
    if (effectiveStartAt) return; // already counting down — no timeout
    const t = setTimeout(() => {
      if (!effectiveStartAt) setPeerTimedOut(true);
    }, PEER_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [effectiveStartAt]);

  const onLeave = async () => {
    try {
      await duelSubmissionService.forfeitDuel(roomId);
    } catch {
      // ignore
    }
    navigation.goBack();
  };

  const opponent = bundle
    ? bundle.participants.find((p) => p.user_id !== me?.id)
    : null;
  const self = bundle
    ? bundle.participants.find((p) => p.user_id === me?.id)
    : null;

  // Cast through Record because the generated DuelParticipant type
  // doesn't include the freshly-added `ready_at` column yet (the
  // migration ran post-codegen). The select uses `*` so the runtime
  // value is present.
  const opponentReady =
    opponent != null &&
    (opponent as Record<string, unknown>).ready_at != null;
  const bothReady = opponentReady && self != null;

  return (
    <ScreenBackground>
      <TopBar title="Logic Duel" />
      <View style={styles.body}>
        <GlassCard style={styles.players}>
          <Player
            name={self?.profile?.display_name ?? me?.display_name ?? 'You'}
            avatarUrl={self?.profile?.avatar_url ?? me?.avatar_url ?? null}
            label="You"
          />
          <View style={styles.vsWrap}>
            <Text style={styles.vs}>VS</Text>
          </View>
          <Player
            name={opponent?.profile?.display_name ?? 'Opponent'}
            avatarUrl={opponent?.profile?.avatar_url ?? null}
            label={opponent ? (opponentReady ? 'Rival' : 'Joining…') : 'Connecting…'}
          />
        </GlassCard>

        <GlassCard style={styles.countdownCard}>
          <Text style={styles.eyebrow}>SAME GRID · SAME CLOCK</Text>
          {bothReady && countdown !== null ? (
            <>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              <Text style={styles.modeName}>{modeMeta?.name ?? mode}</Text>
              <Text style={styles.preparing}>Both players ready.</Text>
            </>
          ) : peerTimedOut ? (
            <>
              <Text style={styles.modeName}>{modeMeta?.name ?? mode}</Text>
              <Text style={styles.timeoutHeadline}>
                {opponent
                  ? `${opponent.profile?.display_name ?? 'Friend'} didn't make it`
                  : 'No one joined'}
              </Text>
              <Text style={styles.timeoutBody}>
                Try another duel — your friend can tap your invite link
                again or you can pick someone else.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.modeName}>{modeMeta?.name ?? mode}</Text>
              <View style={styles.connectingRow}>
                <ActivityIndicator color={colors.textMuted} size="small" />
                <Text style={styles.connectingText}>
                  {opponent
                    ? `Waiting for ${opponent.profile?.username ? '@' + opponent.profile.username : opponent.profile?.display_name ?? 'friend'} to join…`
                    : 'Waiting for opponent to join…'}
                </Text>
              </View>
            </>
          )}
        </GlassCard>

        <View style={styles.actions}>
          <PremiumButton
            label={peerTimedOut ? 'Leave' : 'Leave duel'}
            variant="ghost"
            onPress={onLeave}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

interface PlayerProps {
  name: string;
  avatarUrl: string | null;
  label: string;
}
function Player({ name, avatarUrl, label }: PlayerProps) {
  return (
    <View style={styles.playerCol}>
      <Avatar size="lg" url={avatarUrl} fallbackName={name} />
      <Text style={styles.playerName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.playerLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  players: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  playerCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  playerName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  playerLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  vsWrap: {
    width: 40,
    alignItems: 'center',
  },
  vs: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.tight,
  },
  countdownCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    fontWeight: fontWeight.semibold,
  },
  countdownNumber: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: 72,
    fontWeight: fontWeight.heavy,
    textShadowColor: colors.accentGoldGlow,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  modeName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  connectingText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  preparing: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  timeoutHeadline: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  timeoutBody: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.4,
    paddingHorizontal: spacing.base,
  },
  actions: {
    gap: spacing.sm,
  },
});
