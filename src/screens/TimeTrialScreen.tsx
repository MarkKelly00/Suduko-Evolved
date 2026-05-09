import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { TIME_TRIAL_MODES } from '@/game/modes/timeTrial';
import { DEFAULT_DUEL_MODE_ID } from '@/game/modes/duel';
import { useProgressStore } from '@/game/state/useProgressStore';
import { useAuthStore } from '@/game/state/useAuthStore';
import { useAuthGate } from '@/components/auth/AuthGate';
import { duelService } from '@/services/duel';
import { shareDuelInviteLink } from '@/services/duel/shareDuelInvite';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import { formatDuration } from '@/utils/formatTime';
import type { RootStackNavigation } from '@/app/navigation/routes';
import type { DuelAttempt, DuelParticipant, DuelRoom } from '@/services/duel';
import type { Profile } from '@/services/supabase/supabaseTypes';

/**
 * Time Trial Hub. Five sections (top → bottom):
 *
 *   1. SOLO SPRINT — guest-allowed, picks between 3-Minute and Daily.
 *   2. ONLINE DUEL — auth-gated, drops into matchmaking.
 *   3. CHALLENGE FRIEND — auth-gated, opens FriendDuelPicker.
 *   4. INVITE LINK — auth-gated, creates a share URL via create_duel_link.
 *   5. RECENT DUELS — last 3 finished duels, deep-link to results.
 *   6. LEADERBOARD shortcut.
 *
 * Solo flow remains exactly as it was — `navigation.navigate('TimeTrialGame',
 * { modeId })`. Nothing about guest play changes.
 */
function TimeTrialScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const requireAuth = useAuthGate();
  const me = useAuthStore((s) => s.profile);
  const bests = useProgressStore((s) => s.timeTrialBests);
  const [recent, setRecent] = useState<
    {
      room: DuelRoom;
      participants: (DuelParticipant & { profile: Profile | null })[];
      attempts: DuelAttempt[];
    }[]
  >([]);

  useEffect(() => {
    if (!me) {
      setRecent([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const list = await duelService.getRecentDuels(me.id, 3);
      if (!cancelled) setRecent(list);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  const onSoloStart = (modeId: string) => {
    navigation.navigate('TimeTrialGame', { modeId });
  };

  const onOnlineDuel = () => {
    requireAuth(
      () => navigation.navigate('Matchmaking', { mode: DEFAULT_DUEL_MODE_ID }),
      { contextSubtitle: 'Sign in to enter the duel queue.' },
    );
  };

  const onChallengeFriend = () => {
    requireAuth(
      () =>
        navigation.navigate('FriendDuelPicker', { mode: DEFAULT_DUEL_MODE_ID }),
      { contextSubtitle: 'Sign in to challenge a friend.' },
    );
  };

  const onInviteLink = () => {
    requireAuth(
      () => {
        // shareDuelInviteLink handles RPC + Share sheet + error visibility
        // (Alert on RPC/Share failure, silent on user-cancel).
        void shareDuelInviteLink(DEFAULT_DUEL_MODE_ID);
      },
      { contextSubtitle: 'Sign in to create a shareable duel link.' },
    );
  };

  const onLeaderboard = () => {
    navigation.navigate('Leaderboard', {
      mode: 'time-trial',
      timeTrialMode: DEFAULT_DUEL_MODE_ID,
    });
  };

  return (
    <ScreenBackground>
      <TopBar title="Time Trial" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          Race the clock — solo, head-to-head, or against a friend.
        </Text>

        {/* ----- Solo Sprint ----- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>SOLO</Text>
        </View>
        {TIME_TRIAL_MODES.map((mode) => {
          const best = bests[mode.id];
          return (
            <GlassCard key={mode.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeTitle}>{mode.name}</Text>
                  <Text style={styles.modeDescription}>
                    {mode.daily ? 'Today’s seeded run' : 'Random seed each run'}{' '}
                    · {mode.durationSeconds}s
                  </Text>
                </View>
                <Text style={styles.modeDuration}>
                  {best ? best.score.toLocaleString() : '—'}
                </Text>
              </View>
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
                onPress={() => onSoloStart(mode.id)}
                variant="primary"
                compact
                style={styles.cta}
              />
            </GlassCard>
          );
        })}

        {/* ----- Online ----- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>ONLINE</Text>
        </View>
        <DuelCard
          eyebrow="Logic duel"
          title="Online Duel"
          body="Find a rival solving the same grid in real time."
          ctaLabel="Quick Duel"
          onPress={onOnlineDuel}
          accent="gold"
        />
        <DuelCard
          eyebrow="Friend"
          title="Challenge a friend"
          body="Pick a friend and send a same-seed challenge."
          ctaLabel="Pick friend"
          onPress={onChallengeFriend}
        />
        <DuelCard
          eyebrow="Anyone"
          title="Invite link"
          body="Generate a share link — first to redeem races you."
          ctaLabel="Create link"
          onPress={onInviteLink}
        />

        {/* ----- Recent ----- */}
        {recent.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>RECENT DUELS</Text>
            </View>
            {recent.map((r) => (
              <RecentRow
                key={r.room.id}
                room={r.room}
                participants={r.participants}
                attempts={r.attempts}
                myUserId={me?.id ?? null}
                onPress={() =>
                  navigation.navigate('DuelResults', { roomId: r.room.id })
                }
              />
            ))}
          </>
        ) : null}

        {/* ----- Leaderboard shortcut ----- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>LEADERBOARD</Text>
        </View>
        <Pressable onPress={onLeaderboard} hitSlop={8} accessibilityRole="link">
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeTitle}>Time Trial leaderboards</Text>
                <Text style={styles.modeDescription}>
                  Friends + global rankings.
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </View>
          </GlassCard>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

interface DuelCardProps {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  accent?: 'gold' | undefined;
  onPress: () => void;
}
function DuelCard({ eyebrow, title, body, ctaLabel, accent, onPress }: DuelCardProps) {
  return (
    <GlassCard style={[styles.card, accent === 'gold' && styles.cardAccent]}>
      <View>
        <Text style={styles.cardEyebrow}>{eyebrow.toUpperCase()}</Text>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeDescription}>{body}</Text>
      </View>
      <PremiumButton
        label={ctaLabel}
        onPress={onPress}
        variant={accent === 'gold' ? 'primary' : 'secondary'}
        compact
        style={styles.cta}
      />
    </GlassCard>
  );
}

interface RecentRowProps {
  room: DuelRoom;
  participants: (DuelParticipant & { profile: Profile | null })[];
  attempts: DuelAttempt[];
  myUserId: string | null;
  onPress: () => void;
}
function RecentRow({ room, participants, attempts, myUserId, onPress }: RecentRowProps) {
  const opponent = participants.find((p) => p.user_id !== myUserId);
  const myAttempt = attempts.find((a) => a.user_id === myUserId);
  const won = myUserId != null && room.winner_id === myUserId;
  const draw = room.status === 'completed' && room.winner_id == null;
  const verdict = won ? 'Won' : draw ? 'Draw' : room.status === 'completed' ? 'Lost' : 'In progress';
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <GlassCard style={styles.recentRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modeTitle} numberOfLines={1}>
            vs {opponent?.profile?.display_name ?? 'Rival'}
          </Text>
          <Text style={styles.modeDescription}>
            {myAttempt
              ? `Score ${myAttempt.score.toLocaleString()} · ${formatDuration(Math.round(myAttempt.time_ms / 1000))}`
              : 'Pending'}
          </Text>
        </View>
        <Text style={[styles.recentVerdict, won && styles.recentVerdictWin]}>
          {verdict}
        </Text>
      </GlassCard>
    </Pressable>
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
    gap: spacing.sm,
  },
  intro: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    paddingTop: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    fontWeight: fontWeight.semibold,
  },
  card: {
    gap: spacing.sm,
  },
  cardAccent: {
    borderColor: colors.accentGold,
    borderWidth: 1,
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardEyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  modeTitle: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  modeDuration: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  modeDescription: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
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
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  cta: {
    marginTop: spacing.xs,
  },
  arrow: {
    color: colors.accentGold,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recentVerdict: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  recentVerdictWin: {
    color: colors.accentGold,
  },
});
