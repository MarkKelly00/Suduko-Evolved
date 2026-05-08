import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useAuthStore } from '@/game/state/useAuthStore';
import { useChallengeIntentStore } from '@/game/state/useChallengeIntentStore';
import {
  challengeService,
  friendService,
  leaderboardService,
} from '@/services/supabase';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type { RootStackNavigation } from '@/app/navigation/routes';
import { hapticsService } from '@/services/haptics/hapticsService';

interface Props {
  /** Campaign level id or sprint mode id (the latter when isSprint=true). */
  levelId: string;
  isSprint: boolean;
  sprintModeId?: string;
  puzzleSeed: string;
  /** The user's just-recorded score for optimistic display while the
   *  cloud submission propagates. */
  myScore: number;
  myTimeSeconds: number;
  myMistakes: number;
  myHints: number;
  myStars?: 1 | 2 | 3 | null;
  myCrown?: boolean | null;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no-auth' }
  | { kind: 'no-friends' }
  | {
      kind: 'ranked';
      rank: number;
      total: number;
      topFriend: { name: string; score: number } | null;
      meIsTop: boolean;
    }
  | { kind: 'pending' };

/**
 * Real friends snippet on the post-game results screen. Replaces the old
 * Game Center placeholder copy. Hides itself entirely when the user isn't
 * signed in — no auth nag during the celebratory beat.
 *
 * For campaign: pulls friend_leaderboard(level) RPC.
 * For time trial: pulls time_trial_leaderboard(mode) and filters to the
 * friend set client-side.
 */
export function ResultsFriendsPanel({
  levelId,
  isSprint,
  sprintModeId,
  puzzleSeed,
  myScore,
  myTimeSeconds,
  myMistakes,
  myHints,
  myStars,
  myCrown,
}: Props) {
  const me = useAuthStore((s) => s.profile);
  const navigation = useNavigation<RootStackNavigation>();
  const challengeTarget = useChallengeIntentStore((s) => s.target);
  const clearIntent = useChallengeIntentStore((s) => s.clear);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!me) {
      setState({ kind: 'no-auth' });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const friends = await friendService.getFriends(me.id);
        if (cancelled) return;
        if (friends.length === 0) {
          setState({ kind: 'no-friends' });
          return;
        }
        const friendIds = new Set([me.id, ...friends.map((f) => f.profile.id)]);

        // Build a uniform { user_id, score, display_name } shape from either
        // RPC so the rank math doesn't have to branch.
        let rows: { user_id: string; score: number; display_name: string | null }[];
        if (isSprint && sprintModeId) {
          const tt = await leaderboardService.getTimeTrialLeaderboard(
            sprintModeId,
            '',
            200,
          );
          rows = tt
            .filter((r) => friendIds.has(r.user_id))
            .map((r) => ({
              user_id: r.user_id,
              score: r.score,
              display_name: r.display_name,
            }));
        } else {
          const lb = await leaderboardService.getFriendLeaderboard(
            me.id,
            levelId,
            100,
          );
          rows = lb.map((r) => ({
            user_id: r.user_id,
            score: r.score,
            display_name: r.display_name,
          }));
        }
        if (cancelled) return;

        // Splice in the just-recorded score if the cloud hasn't caught up.
        const haveSelf = rows.some((r) => r.user_id === me.id);
        if (!haveSelf) {
          rows.push({
            user_id: me.id,
            score: myScore,
            display_name: me.display_name ?? 'You',
          });
        }

        // Higher score = better rank.
        rows.sort((a, b) => b.score - a.score);
        const rank = rows.findIndex((r) => r.user_id === me.id) + 1;
        if (rank === 0) {
          // We're not in the visible window even after splicing — show pending.
          setState({ kind: 'pending' });
          return;
        }
        const topRow = rows[0];
        const topIsMe = topRow?.user_id === me.id;
        const topFriendRow = topIsMe ? rows[1] : topRow;
        setState({
          kind: 'ranked',
          rank,
          total: rows.length,
          meIsTop: topIsMe,
          topFriend: topFriendRow
            ? {
                name: topFriendRow.display_name ?? 'Friend',
                score: topFriendRow.score,
              }
            : null,
        });
      } catch {
        if (!cancelled) setState({ kind: 'pending' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, levelId, isSprint, sprintModeId, myScore]);

  // Suppress entirely when there's nothing meaningful to show.
  if (state.kind === 'no-auth') return null;

  const openLeaderboard = () => {
    navigation.navigate('Leaderboard', {
      scope: 'friends',
      mode: isSprint ? 'time-trial' : 'campaign-level',
      levelId: isSprint ? undefined : levelId,
      timeTrialMode: isSprint ? sprintModeId : undefined,
    });
  };
  const openFindFriends = () => {
    navigation.navigate('Friends', { initialTab: 'add' });
  };

  const sendOutboundChallenge = async () => {
    if (!challengeTarget || sending) return;
    setSending(true);
    try {
      const result = await challengeService.createChallenge({
        opponentId: challengeTarget.id,
        mode: isSprint ? 'sprint' : 'campaign',
        levelId,
        sprintModeId: isSprint ? (sprintModeId ?? null) : null,
        puzzleSeed,
        challengerAttempt: {
          score: myScore,
          timeSeconds: myTimeSeconds,
          mistakes: myMistakes,
          hints: myHints,
          stars: isSprint ? null : (myStars ?? null),
          crown: isSprint ? null : (myCrown ?? null),
        },
      });
      if (!result) {
        Alert.alert('Could not send challenge', 'Please try again later.');
        return;
      }
      const friendName =
        challengeTarget.display_name ?? challengeTarget.username ?? 'your friend';
      setSentMessage(`Challenge sent to ${friendName}.`);
      hapticsService.success();
      clearIntent();
    } catch (err) {
      Alert.alert(
        'Could not send challenge',
        err instanceof Error ? err.message : 'Please try again later.',
      );
    } finally {
      setSending(false);
    }
  };

  const cancelOutboundIntent = () => {
    clearIntent();
  };

  // When the user navigated here from FriendProfile → "Challenge", surface
  // a single-tap "Send challenge" panel. This replaces the rank panel for
  // the celebratory moment — they came here to send the challenge.
  if (challengeTarget && !sentMessage) {
    const friendName =
      challengeTarget.display_name ?? challengeTarget.username ?? 'your friend';
    return (
      <GlassCard style={[styles.card, styles.cardChallenge]}>
        <Text style={styles.sectionTitle}>Outbound challenge</Text>
        <Text style={styles.challengeHeadline}>
          Challenge {friendName} with this run?
        </Text>
        <Text style={styles.body}>
          They’ll get a notification, play the same puzzle, and the winner is
          decided automatically.
        </Text>
        <View style={styles.ctaStack}>
          <PremiumButton
            label={sending ? 'Sending…' : `Send challenge to ${friendName}`}
            variant="primary"
            onPress={sendOutboundChallenge}
            disabled={sending}
          />
          <PremiumButton
            label="Not now"
            variant="ghost"
            onPress={cancelOutboundIntent}
            compact
          />
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.sectionTitle}>Friends</Text>
      {sentMessage ? (
        <View style={styles.sentRow}>
          <Text style={styles.sentText}>{sentMessage}</Text>
        </View>
      ) : null}
      {state.kind === 'loading' ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      ) : state.kind === 'no-friends' ? (
        <>
          <Text style={styles.body}>
            Add friends to see how this run stacks up — and challenge them with the
            same puzzle in a tap.
          </Text>
          <View style={styles.ctaRow}>
            <PremiumButton
              label="Find friends"
              variant="secondary"
              onPress={openFindFriends}
              compact
            />
          </View>
        </>
      ) : state.kind === 'pending' ? (
        <Text style={styles.body}>
          Score submitted. Friend ranking will appear here once the leaderboard
          catches up.
        </Text>
      ) : state.kind === 'ranked' ? (
        <>
          <View style={styles.rankRow}>
            <Text style={styles.rankNumber}>
              {state.meIsTop ? '#1' : `#${state.rank}`}
            </Text>
            <Text style={styles.rankLabel}>
              {state.meIsTop
                ? `of ${state.total} ${state.total === 1 ? 'friend' : 'friends'} — you're on top`
                : `of ${state.total} ${state.total === 1 ? 'friend' : 'friends'}`}
            </Text>
          </View>
          {state.topFriend && !state.meIsTop ? (
            <Text style={styles.body}>
              {state.topFriend.name} leads with{' '}
              <Text style={styles.bodyAccent}>
                {state.topFriend.score.toLocaleString()}
              </Text>
              .
            </Text>
          ) : state.topFriend && state.meIsTop ? (
            <Text style={styles.body}>
              Closest behind: {state.topFriend.name} at{' '}
              <Text style={styles.bodyAccent}>
                {state.topFriend.score.toLocaleString()}
              </Text>
              .
            </Text>
          ) : null}
          <View style={styles.ctaRow}>
            <PremiumButton
              label="View leaderboard"
              variant="secondary"
              onPress={openLeaderboard}
              compact
            />
          </View>
        </>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  loadingRow: {
    paddingVertical: spacing.base,
    alignItems: 'flex-start',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  rankNumber: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.tight,
    textShadowColor: colors.accentGoldGlow,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  rankLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  body: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
  },
  bodyAccent: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  ctaRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  ctaStack: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cardChallenge: {
    borderColor: colors.accentGold,
    borderWidth: 1,
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  challengeHeadline: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  sentRow: {
    paddingVertical: spacing.xs,
  },
  sentText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
