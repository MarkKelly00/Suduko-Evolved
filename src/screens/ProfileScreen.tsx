import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { CurrencyPill } from '@/components/ui/CurrencyPill';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Avatar } from '@/components/profile/Avatar';
import { useAuthStore } from '@/game/state/useAuthStore';
import { useAuthGate } from '@/components/auth/AuthGate';
import { useProgressStore } from '@/game/state/useProgressStore';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { WORLD_1_LEVELS } from '@/game/content/levels';
import {
  gameCenterService,
  isPlatformIOS,
  type GameCenterPlayer,
} from '@/services/gameCenter';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type { RootStackNavigation } from '@/app/navigation/routes';

function ProfileScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const requireAuth = useAuthGate();
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const syncStatus = useAuthStore((s) => s.syncStatus);

  const totalXP = useProgressStore((s) => s.totalXP);
  const currentStreak = useProgressStore((s) => s.currentStreak);
  const levels = useProgressStore((s) => s.levels);
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds);
  const timeTrialBests = useProgressStore((s) => s.timeTrialBests);

  const totalStars = Object.values(levels).reduce((sum, e) => sum + e.stars, 0);
  const crowns = Object.values(levels).filter((e) => e.crown).length;
  const totalLevels = WORLD_1_LEVELS.length;
  const progress = completedLevelIds.length / totalLevels;
  const sprintBest = timeTrialBests['sprint-3min'];

  const isAuthenticated = status === 'authenticated' && profile != null;

  // Game Center status for the optional GC card. Only rendered on iOS
  // when the user has opted in via Settings AND is currently signed in
  // with Apple. Refresh on mount.
  const gameCenterOptIn = useSettingsStore((s) => s.gameCenterOptIn);
  const [gcPlayer, setGcPlayer] = useState<GameCenterPlayer | null>(null);
  const [gcReady, setGcReady] = useState(false);
  useEffect(() => {
    if (!isPlatformIOS() || !gameCenterOptIn) {
      setGcReady(false);
      setGcPlayer(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const authed = await gameCenterService.isAuthenticated();
      if (cancelled) return;
      if (!authed) {
        setGcReady(false);
        setGcPlayer(null);
        return;
      }
      const player = await gameCenterService.getLocalPlayer();
      if (cancelled) return;
      setGcPlayer(player);
      setGcReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameCenterOptIn]);

  return (
    <ScreenBackground>
      <TopBar
        title="Profile"
        rightSlot={syncStatus === 'running' ? <SyncIndicator /> : null}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isAuthenticated ? (
          <AuthenticatedHeader
            profile={profile}
            onEdit={() => navigation.navigate('EditProfile')}
            totalXP={totalXP}
            currentStreak={currentStreak}
          />
        ) : (
          <View style={styles.header}>
            <ProgressRing
              progress={progress}
              size={120}
              label={`${completedLevelIds.length}/${totalLevels}`}
              caption="cleared"
            />
            <View style={styles.pillsColumn}>
              <CurrencyPill label="XP" value={totalXP} icon="" />
              <CurrencyPill label="streak" value={currentStreak} icon="" />
            </View>
          </View>
        )}

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Stars &amp; Crowns</Text>
          <View style={styles.statsRow}>
            <Stat label="Stars" value={`${totalStars}/${totalLevels * 3}`} />
            <Stat label="Crowns" value={`${crowns}`} />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Time Trial</Text>
          <View style={styles.statsRow}>
            <Stat label="Best Score" value={`${sprintBest?.score ?? 0}`} />
            <Stat label="Best Time (s)" value={`${sprintBest?.time ?? 0}`} />
          </View>
        </GlassCard>

        {gcReady ? (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Game Center</Text>
            {gcPlayer?.displayName ? (
              <Text style={styles.placeholder}>
                {`Signed in as ${gcPlayer.displayName}.`}
              </Text>
            ) : (
              <Text style={styles.placeholder}>Connected.</Text>
            )}
            <PremiumButton
              label="View leaderboards"
              variant="secondary"
              compact
              onPress={() => void gameCenterService.showLeaderboard()}
              style={styles.gcButton}
            />
            <PremiumButton
              label="View achievements"
              variant="secondary"
              compact
              onPress={() => void gameCenterService.showAchievements()}
              style={styles.gcButton}
            />
          </GlassCard>
        ) : null}

        {isAuthenticated ? (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Friends</Text>
            <Pressable
              onPress={() => navigation.navigate('Friends')}
              style={styles.friendsLink}
              accessibilityRole="button"
              accessibilityLabel="View friends"
            >
              <Text style={styles.friendsLinkText}>View friends → </Text>
            </Pressable>
            <Text style={styles.placeholder}>
              Tap above to see friend requests, challenges, and the friend
              leaderboard.
            </Text>
          </GlassCard>
        ) : (
          <SignInPromptCard
            onSignIn={() =>
              requireAuth(() => navigation.navigate('Friends'), {
                contextSubtitle: 'Sign in to challenge friends and join leaderboards.',
              })
            }
          />
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

function AuthenticatedHeader({
  profile,
  onEdit,
  totalXP,
  currentStreak,
}: {
  profile: NonNullable<ReturnType<typeof useAuthStore.getState>['profile']>;
  onEdit: () => void;
  totalXP: number;
  currentStreak: number;
}) {
  return (
    <View style={styles.authHeader}>
      <Avatar
        size="lg"
        url={profile.avatar_url}
        fallbackName={profile.display_name ?? profile.username}
      />
      <View style={styles.authInfo}>
        <Text style={styles.displayName}>
          {profile.display_name ?? 'Sudoku player'}
        </Text>
        {profile.username ? (
          <Text style={styles.username}>{`@${profile.username}`}</Text>
        ) : null}
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit profile">
          <Text style={styles.editLink}>Edit profile</Text>
        </Pressable>
        <View style={styles.pillsRow}>
          <CurrencyPill label="XP" value={totalXP} icon="" />
          <CurrencyPill label="streak" value={currentStreak} icon="" />
        </View>
      </View>
    </View>
  );
}

function SignInPromptCard({ onSignIn }: { onSignIn: () => void }) {
  return (
    <GlassCard style={styles.signInCard}>
      <Text style={styles.signInHeading}>Make it social</Text>
      <Text style={styles.signInBody}>
        Sign in to challenge friends, climb leaderboards, and back up your garden.
      </Text>
      <PremiumButton label="Sign in" variant="primary" onPress={onSignIn} />
    </GlassCard>
  );
}

function SyncIndicator() {
  return (
    <View style={styles.syncWrapper}>
      <View style={styles.syncDot} />
      <Text style={styles.syncText}>Syncing…</Text>
    </View>
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

export default ProfileScreen;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  authHeader: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  authInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  displayName: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  username: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  editLink: {
    color: colors.accentGoldGlow,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
    marginTop: spacing.xxs,
  },
  pillsColumn: {
    gap: spacing.sm,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  card: {
    gap: spacing.sm,
  },
  gcButton: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
  },
  friendsLink: {
    paddingVertical: spacing.xxs,
  },
  friendsLinkText: {
    color: colors.accentGoldGlow,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  signInCard: {
    gap: spacing.base,
  },
  signInHeading: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  signInBody: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
  },
  syncWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentTeal,
  },
  syncText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
