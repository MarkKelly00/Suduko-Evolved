import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { TIME_TRIAL_MODES } from '@/game/modes/timeTrial';
import { DEFAULT_DUEL_MODE_ID } from '@/game/modes/duel';
import { useProgressStore } from '@/game/state/useProgressStore';
import { useAuthGate } from '@/components/auth/AuthGate';
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

/**
 * Time Trial Hub. Action-oriented — every section here helps the
 * player START a duel or sprint. Duel HISTORY (past results, rematch
 * paths) lives in Friends → Challenges → Duels (the canonical home),
 * reachable via the slim "View duel history →" link below.
 *
 * Sections (top → bottom):
 *   1. SOLO SPRINT — guest-allowed, picks between 3-Minute and Daily.
 *   2. ONLINE DUEL — auth-gated, drops into matchmaking.
 *   3. CHALLENGE FRIEND — auth-gated, opens FriendDuelPicker.
 *   4. INVITE LINK — auth-gated, creates a share URL.
 *   5. LEADERBOARD shortcut.
 *
 * (Previously hosted a "RECENT DUELS" inline list; removed in favour
 * of the deep link so the screen stays focused on action.)
 */
function TimeTrialScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const requireAuth = useAuthGate();
  const bests = useProgressStore((s) => s.timeTrialBests);

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

        {/* Slim deep-link to the canonical duel-history home. Replaces
            the old inline 3-row Recent Duels list — that was history
            data on an action-focused screen. Friends → Challenges →
            Duels is one tap away and surfaces the full set. */}
        <Pressable
          onPress={() =>
            navigation.navigate('Friends', {
              initialTab: 'challenges',
              initialChallengeKind: 'duels',
            })
          }
          hitSlop={8}
          accessibilityRole="link"
          style={({ pressed }) => [
            styles.historyLink,
            pressed && styles.historyLinkPressed,
          ]}
        >
          <Text style={styles.historyLinkText}>View duel history</Text>
          <Text style={styles.historyLinkArrow}>{'→'}</Text>
        </Pressable>

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
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  historyLinkPressed: {
    opacity: 0.6,
  },
  historyLinkText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  historyLinkArrow: {
    color: colors.accentGold,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
