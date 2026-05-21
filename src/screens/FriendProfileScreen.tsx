import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard';
import { ProfileStatsGrid } from '@/components/profile/ProfileStatsGrid';
import { ProfileRecentSolvesList } from '@/components/profile/ProfileRecentSolvesList';
import {
  friendService,
  profileService,
  type Profile,
} from '@/services/supabase';
import type { RecentSolve } from '@/services/supabase/profileService';
import { useChallengeIntentStore } from '@/game/state/useChallengeIntentStore';
import { hapticsService } from '@/services/haptics/hapticsService';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

export default function FriendProfileScreen() {
  const route = useRoute<RootRouteProp<'FriendProfile'>>();
  const navigation = useNavigation<RootStackNavigation>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [solves, setSolves] = useState<RecentSolve[]>([]);
  const [status, setStatus] = useState<
    'none' | 'pending_in' | 'pending_out' | 'accepted' | 'blocked'
  >('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [p, s, rs] = await Promise.all([
        profileService.getProfile(userId),
        friendService.getFriendshipStatus(userId),
        profileService.getRecentSolves(userId, 6),
      ]);
      if (cancelled) return;
      setProfile(p);
      setStatus(s);
      setSolves(rs);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleRemove = () => {
    Alert.alert(
      'Remove friend?',
      'They will need to send a new request to friend you again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Look up friendship row and delete it.
            const friends = await friendService.getFriends();
            const row = friends.find((f) => f.profile.id === userId);
            if (row) await friendService.removeFriend(row.friendship.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleChallenge = () => {
    if (!profile) return;
    const friendName = profile.display_name ?? profile.username ?? 'this player';
    Alert.alert(
      `Challenge ${friendName}`,
      'Pick a puzzle to play first. After your run, tap “Send challenge” on the results screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Campaign level',
          onPress: () => {
            useChallengeIntentStore.getState().setTarget({
              id: profile.id,
              display_name: profile.display_name,
              username: profile.username,
              avatar_url: profile.avatar_url,
            });
            hapticsService.selection();
            navigation.navigate('Map');
          },
        },
        {
          text: '3-Minute Sprint',
          onPress: () => {
            useChallengeIntentStore.getState().setTarget({
              id: profile.id,
              display_name: profile.display_name,
              username: profile.username,
              avatar_url: profile.avatar_url,
            });
            hapticsService.selection();
            navigation.navigate('TimeTrial');
          },
        },
      ],
    );
  };

  const handleBlock = () => {
    if (!profile) return;
    const friendName = profile.display_name ?? profile.username ?? 'this player';
    Alert.alert(
      `Block ${friendName}?`,
      'They won’t be able to send you friend requests or challenges. You can unblock them later from this screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendService.blockUser(profile.id);
              setStatus('blocked');
              hapticsService.success();
            } catch (err) {
              if (__DEV__) console.warn('[FriendProfile.block]', err);
              Alert.alert(
                'Could not block',
                err instanceof Error ? err.message : 'Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ScreenBackground>
        <TopBar title="Profile" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </ScreenBackground>
    );
  }

  if (!profile) {
    return (
      <ScreenBackground>
        <TopBar title="Profile" />
        <View style={styles.body}>
          <GlassCard>
            <Text style={styles.errorText}>This profile is unavailable.</Text>
          </GlassCard>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <TopBar title="Profile" />
      <ScrollView contentContainerStyle={styles.body}>
        <ProfileHeaderCard
          displayName={profile.display_name ?? 'Sudoku player'}
          username={profile.username ?? null}
          avatarUrl={profile.avatar_url}
          crownsTotal={profile.crowns_total}
          streak={profile.streak}
        />
        <ProfileStatsGrid
          xp={profile.xp}
          levelsCleared={profile.levels_cleared}
          starsTotal={profile.stars_total}
          crownsTotal={profile.crowns_total}
          bestTimeTrialScore={profile.best_time_trial_score}
          createdAt={profile.created_at}
        />
        <ProfileRecentSolvesList solves={solves} />

        {status === 'accepted' ? (
          <>
            <PremiumButton
              label="Challenge"
              variant="primary"
              onPress={handleChallenge}
            />
            <PremiumButton
              label="Remove friend"
              variant="ghost"
              onPress={handleRemove}
            />
          </>
        ) : status === 'pending_out' ? (
          <PremiumButton label="Request sent" variant="ghost" disabled onPress={() => undefined} />
        ) : status === 'pending_in' ? (
          <GlassCard>
            <Text style={styles.note}>
              They sent you a friend request — accept it on the Requests tab.
            </Text>
          </GlassCard>
        ) : status === 'blocked' ? (
          <GlassCard>
            <Text style={styles.note}>You have blocked this user.</Text>
          </GlassCard>
        ) : (
          <PremiumButton
            label="Add friend"
            variant="primary"
            onPress={async () => {
              try {
                await friendService.sendRequest(userId);
                setStatus('pending_out');
              } catch (err) {
                Alert.alert(
                  'Could not send request',
                  err instanceof Error ? err.message : 'Please try again.',
                );
              }
            }}
          />
        )}

        <Pressable onPress={handleBlock} style={styles.blockLink}>
          <Text style={styles.blockText}>Block</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  blockLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  blockText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    textDecorationLine: 'underline',
  },
});
