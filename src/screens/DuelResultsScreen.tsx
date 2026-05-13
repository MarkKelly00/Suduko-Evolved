import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Avatar } from '@/components/profile/Avatar';
import { useAuthStore } from '@/game/state/useAuthStore';
import {
  duelService,
  duelRealtimeService,
  matchmakingService,
  type DuelAttempt,
} from '@/services/duel';
import { friendService } from '@/services/supabase';
import {
  getDuelWinsCount,
  recordDuelWin,
  submitDuelResult,
} from '@/game/leaderboards/leaderboardSubmissions';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import { formatDuration } from '@/utils/formatTime';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

/**
 * Duel results — winner banner + side-by-side comparison + rematch /
 * add-friend / share. Subscribes to room status so we can render a "still
 * waiting on opponent" state while their attempt is in flight.
 */
export default function DuelResultsScreen() {
  const route = useRoute<RootRouteProp<'DuelResults'>>();
  const navigation = useNavigation<RootStackNavigation>();
  const me = useAuthStore((s) => s.profile);
  const { roomId } = route.params;
  const [bundle, setBundle] = useState<Awaited<
    ReturnType<typeof duelService.getDuelRoom>
  > | null>(null);
  const [friendStatus, setFriendStatus] = useState<
    'none' | 'pending_in' | 'pending_out' | 'accepted' | 'blocked'
  >('none');
  // Three defensive guards against the "infinite spinner" failure
  // mode users reported (data is in cloud, but the screen never
  // resolves):
  //   1. loadedOnceRef — once we have a non-null bundle, future
  //      transient null returns from refresh() do NOT reset bundle.
  //      Prevents a realtime-driven refetch failure (network blip,
  //      RLS hiccup) from blanking a successfully-loaded screen.
  //   2. showRetry — after 3s with no bundle, expose a manual "Try
  //      again" button so the user is never stranded.
  //   3. __DEV__ console.warn on the load path so future failures
  //      are diagnosable without code changes.
  const loadedOnceRef = useRef(false);
  const [showRetry, setShowRetry] = useState(false);

  const refresh = async () => {
    try {
      const b = await duelService.getDuelRoom(roomId);
      if (b) {
        loadedOnceRef.current = true;
        setBundle(b);
      } else if (__DEV__) {
        console.warn(
          '[DuelResultsScreen] getDuelRoom returned null',
          { roomId, loadedOnce: loadedOnceRef.current },
        );
      }
      // Subsequent null returns AFTER a successful load are silently
      // ignored — see comment block above.
    } catch (err) {
      if (__DEV__) console.warn('[DuelResultsScreen] refresh threw:', err);
    }
  };

  useEffect(() => {
    void refresh();
    const unsub = duelRealtimeService.subscribeRoomState(roomId, () => {
      void refresh();
    });
    const retryTimer = setTimeout(() => {
      if (!loadedOnceRef.current) setShowRetry(true);
    }, 3000);
    // Belt-and-braces safety poll: every 5s while the bundle is still
    // null (initial load failed or first realtime event was dropped),
    // refresh from scratch. Stops as soon as we have a bundle. This is
    // cheap (single SELECT) and immune to any future regression that
    // breaks the realtime subscription path.
    const poll = setInterval(() => {
      if (!loadedOnceRef.current) void refresh();
    }, 5000);
    return () => {
      unsub();
      clearTimeout(retryTimer);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Friendship lookup for the "Add friend" CTA.
  useEffect(() => {
    if (!bundle || !me) return;
    const opp = bundle.participants.find((p) => p.user_id !== me.id);
    if (!opp) return;
    let cancelled = false;
    void (async () => {
      const status = await friendService.getFriendshipStatus(opp.user_id);
      if (!cancelled) setFriendStatus(status);
    })();
    return () => {
      cancelled = true;
    };
  }, [bundle, me]);

  if (!bundle) {
    return (
      <ScreenBackground>
        <TopBar title="Duel Results" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textMuted} />
          {showRetry ? (
            <View style={styles.retryWrap}>
              <Text style={styles.retryHint}>
                Taking longer than usual to load.
              </Text>
              <PremiumButton
                label="Try again"
                variant="secondary"
                compact
                onPress={() => {
                  setShowRetry(false);
                  void refresh();
                }}
              />
            </View>
          ) : null}
        </View>
      </ScreenBackground>
    );
  }

  const myAttempt = bundle.attempts.find((a) => a.user_id === me?.id);
  const opponentAttempt = bundle.attempts.find((a) => a.user_id !== me?.id);
  const myParticipant = bundle.participants.find((p) => p.user_id === me?.id);
  const opponentParticipant = bundle.participants.find(
    (p) => p.user_id !== me?.id,
  );

  const isComplete = bundle.room.status === 'completed';
  const winnerId = bundle.room.winner_id;
  const isWinner = me != null && winnerId === me.id;

  // Game Center submission. Fires once per room, the moment we observe
  // status==='completed' AND we have our own attempt to read. The
  // realtime subscription may re-fire `refresh()` multiple times, so
  // the ref guard prevents double-submits on the same room. Apple's
  // GameKit dedupe is also idempotent, so even if it slipped past
  // we'd be OK — the ref is purely a network-saver.
  const gcFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isComplete || !me) return;
    if (gcFiredRef.current === bundle.room.id) return;
    const myAttempt = bundle.attempts.find((a) => a.user_id === me.id);
    if (!myAttempt) return;
    gcFiredRef.current = bundle.room.id;
    const cumulativeWins = isWinner
      ? recordDuelWin(bundle.room.id)
      : getDuelWinsCount();
    void submitDuelResult({
      score: myAttempt.score,
      won: isWinner,
      perfect: myAttempt.crown === true,
      cumulativeWins,
    });
  }, [isComplete, isWinner, me, bundle.room.id, bundle.attempts]);
  const isDraw = isComplete && winnerId == null && bundle.attempts.length === 2;
  const opponentMissing = isComplete && bundle.attempts.length < 2;
  const waitingForOpponent = !isComplete && myAttempt && !opponentAttempt;

  const banner = isWinner
    ? 'Victory'
    : isDraw
      ? 'Draw'
      : opponentMissing
        ? 'Opponent forfeited'
        : isComplete
          ? 'Defeat'
          : 'Waiting…';

  const onRematch = async () => {
    // Re-enter matchmaking with the same mode for a quick rematch.
    try {
      const result = await matchmakingService.joinMatchmaking(bundle.room.mode);
      if (result.status === 'matched') {
        navigation.replace('DuelLobby', {
          roomId: result.roomId,
          puzzleSeed: result.puzzleSeed,
          mode: bundle.room.mode,
          startAt: result.startAt,
        });
      } else {
        navigation.replace('Matchmaking', { mode: bundle.room.mode });
      }
    } catch {
      navigation.replace('Matchmaking', { mode: bundle.room.mode });
    }
  };

  const onShare = async () => {
    const lines = isWinner
      ? [`Beat ${opponentParticipant?.profile?.display_name ?? 'a rival'} on Sudoku Evolved.`]
      : [`Played ${opponentParticipant?.profile?.display_name ?? 'a rival'} on Sudoku Evolved.`];
    if (myAttempt) {
      lines.push(`Score ${myAttempt.score.toLocaleString()} · ${formatDuration(Math.round(myAttempt.time_ms / 1000))}`);
    }
    await Share.share({
      message: `${lines.join('\n')}\n\nhttps://sudokuevolved.com`,
    });
  };

  const onAddFriend = async () => {
    if (!opponentParticipant || !me) return;
    if (friendStatus !== 'none' && friendStatus !== 'pending_in') return;
    if (friendStatus === 'pending_in') {
      // accept their incoming request — defer to friendService
      const requests = await friendService.getIncomingRequests();
      const row = requests.find(
        (r) => r.profile.id === opponentParticipant.user_id,
      );
      if (row) {
        try {
          await friendService.acceptRequest(row.friendship.id);
          setFriendStatus('accepted');
        } catch {
          /* ignore */
        }
      }
      return;
    }
    try {
      await friendService.sendRequest(opponentParticipant.user_id);
      setFriendStatus('pending_out');
    } catch {
      /* ignore */
    }
  };

  return (
    <ScreenBackground>
      <TopBar title="Duel Results" />
      <View style={styles.body}>
        <GlassCard style={[styles.banner, isWinner && styles.bannerWin]}>
          <Text style={styles.bannerEyebrow}>
            {isComplete ? 'FINAL' : 'IN PROGRESS'}
          </Text>
          <Text style={[styles.bannerTitle, isWinner && styles.bannerTitleWin]}>
            {banner}
          </Text>
          {waitingForOpponent ? (
            <View style={styles.waitingRow}>
              <ActivityIndicator color={colors.textMuted} size="small" />
              <Text style={styles.waitingText}>Waiting for opponent…</Text>
            </View>
          ) : null}
        </GlassCard>

        <GlassCard style={styles.compareCard}>
          <Side
            label="You"
            displayName={
              myParticipant?.profile?.display_name ??
              me?.display_name ??
              'You'
            }
            avatarUrl={myParticipant?.profile?.avatar_url ?? me?.avatar_url ?? null}
            attempt={myAttempt ?? null}
            highlight={isWinner}
          />
          <View style={styles.divider} />
          <Side
            label="Opponent"
            displayName={
              opponentParticipant?.profile?.display_name ?? 'Rival'
            }
            avatarUrl={opponentParticipant?.profile?.avatar_url ?? null}
            attempt={opponentAttempt ?? null}
            highlight={isComplete && winnerId === opponentParticipant?.user_id}
          />
        </GlassCard>

        <View style={styles.actions}>
          <PremiumButton label="Rematch" variant="primary" onPress={onRematch} />
          {opponentParticipant && (friendStatus === 'none' || friendStatus === 'pending_in') ? (
            <PremiumButton
              label={friendStatus === 'pending_in' ? 'Accept friend request' : 'Add friend'}
              variant="secondary"
              onPress={onAddFriend}
            />
          ) : null}
          <PremiumButton label="Share result" variant="secondary" onPress={onShare} compact />
          <PremiumButton
            label="Back to Time Trial"
            variant="ghost"
            onPress={() => navigation.popToTop()}
            compact
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

interface SideProps {
  label: string;
  displayName: string;
  avatarUrl: string | null;
  attempt: DuelAttempt | null;
  highlight?: boolean;
}
function Side({ label, displayName, avatarUrl, attempt, highlight }: SideProps) {
  return (
    <View style={styles.side}>
      <Avatar size="md" url={avatarUrl} fallbackName={displayName} />
      <Text style={styles.sideLabel}>{label}</Text>
      <Text
        style={[styles.sideName, highlight && styles.sideNameWin]}
        numberOfLines={1}
      >
        {displayName}
      </Text>
      {attempt ? (
        <>
          <Text style={[styles.sideScore, highlight && styles.sideScoreWin]}>
            {attempt.score.toLocaleString()}
          </Text>
          <Text style={styles.sideMeta}>
            {formatDuration(Math.round(attempt.time_ms / 1000))} · {attempt.mistakes}M ·{' '}
            {attempt.hints}H
          </Text>
          {attempt.crown ? <Text style={styles.crown}>♛ Perfect</Text> : null}
        </>
      ) : (
        <Text style={styles.sideMeta}>—</Text>
      )}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
  },
  retryWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  retryHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  banner: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  bannerWin: {
    borderColor: colors.accentGold,
    borderWidth: 1,
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  bannerEyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    fontWeight: fontWeight.semibold,
  },
  bannerTitle: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.tight,
  },
  bannerTitleWin: {
    color: colors.accentGold,
    textShadowColor: colors.accentGoldGlow,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  waitingText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  compareCard: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
  },
  side: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: spacing.sm,
  },
  sideLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  sideName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  sideNameWin: {
    color: colors.accentGold,
  },
  sideScore: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
    marginTop: spacing.xs,
  },
  sideScoreWin: {
    color: colors.accentGold,
  },
  sideMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  crown: {
    color: colors.accentGold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  actions: {
    gap: spacing.sm,
  },
});
