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
import { CurrencyPill } from '@/components/ui/CurrencyPill';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Avatar } from '@/components/profile/Avatar';
import {
  friendService,
  profileService,
  type Profile,
} from '@/services/supabase';
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
  const [status, setStatus] = useState<
    'none' | 'pending_in' | 'pending_out' | 'accepted' | 'blocked'
  >('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [p, s] = await Promise.all([
        profileService.getProfile(userId),
        friendService.getFriendshipStatus(userId),
      ]);
      if (cancelled) return;
      setProfile(p);
      setStatus(s);
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
        <View style={styles.hero}>
          <Avatar
            size="xl"
            url={profile.avatar_url}
            fallbackName={profile.display_name ?? profile.username}
          />
          <Text style={styles.displayName}>
            {profile.display_name ?? 'Sudoku player'}
          </Text>
          {profile.username ? (
            <Text style={styles.handle}>{`@${profile.username}`}</Text>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <CurrencyPill label="XP" value={profile.xp} icon="" />
          <CurrencyPill label="streak" value={profile.streak} icon="" />
          <CurrencyPill label="cleared" value={profile.levels_cleared} icon="" />
        </View>
        <View style={styles.statsRow}>
          <CurrencyPill label="stars" value={profile.stars_total} icon="" />
          <CurrencyPill label="crowns" value={profile.crowns_total} icon="" />
          <CurrencyPill label="best TT" value={profile.best_time_trial_score} icon="" />
        </View>

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
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  displayName: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
    textShadowColor: 'rgba(245,213,138,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  handle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.wide,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
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
