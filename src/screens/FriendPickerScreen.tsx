import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { FriendListItem } from '@/components/friends/FriendListItem';
import { InlineToast } from '@/components/ui/InlineToast';
import { useAuthStore } from '@/game/state/useAuthStore';
import { challengeService, friendService, type Profile } from '@/services/supabase';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

export default function FriendPickerScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const route = useRoute<RootRouteProp<'FriendPicker'>>();
  const me = useAuthStore((s) => s.profile);
  const params = route.params;

  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!me) return;
    const list = await friendService.getFriends(me.id);
    setFriends(list.map((row) => row.profile));
  }, [me]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const sendChallenge = async (friend: Profile) => {
    if (submitting || !me) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await challengeService.createChallenge({
        opponentId: friend.id,
        mode: params.mode,
        levelId: params.levelId,
        sprintModeId: params.sprintModeId ?? null,
        puzzleSeed: params.puzzleSeed,
        challengerAttempt: {
          score: params.challengerAttempt.score,
          timeSeconds: params.challengerAttempt.timeSeconds,
          mistakes: params.challengerAttempt.mistakes,
          hints: params.challengerAttempt.hints,
          stars: params.challengerAttempt.stars,
          crown: params.challengerAttempt.crown,
        },
      });
      if (result) {
        setSuccess(`Challenge sent to @${friend.username ?? 'friend'}`);
        setTimeout(() => navigation.goBack(), 700);
      } else {
        setError('Could not send challenge — try again later.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!me) {
    return (
      <ScreenBackground>
        <CloseHeader onClose={() => navigation.goBack()} />
        <View style={styles.body}>
          <GlassCard>
            <Text style={styles.emptyTitle}>Sign in required</Text>
            <Text style={styles.emptyBody}>Sign in to challenge a friend.</Text>
          </GlassCard>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <CloseHeader onClose={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.eyebrow}>CHALLENGE</Text>
        <Text style={styles.title}>Pick a friend</Text>
        <Text style={styles.subtitle}>
          {`They'll get the same puzzle and try to beat your `}
          <Text style={styles.scoreInline}>
            {params.challengerAttempt.score.toLocaleString()}
          </Text>
          .
        </Text>

        {success ? <InlineToast variant="success" message={success} nonce={success} /> : null}
        {error ? <InlineToast variant="error" message={error} nonce={error} /> : null}

        {loading ? (
          <ActivityIndicator color={colors.textMuted} style={styles.loading} />
        ) : friends.length === 0 ? (
          <GlassCard>
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptyBody}>
              Add a friend by username to challenge them.
            </Text>
            <PremiumButton
              label="Add a friend"
              variant="primary"
              onPress={() => {
                navigation.replace('Friends', { initialTab: 'add' });
              }}
            />
          </GlassCard>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <FriendListItem
                profile={item}
                action={{
                  label: submitting ? '…' : 'Send',
                  variant: 'primary',
                  disabled: submitting,
                  onPress: () => void sendChallenge(item),
                }}
              />
            )}
          />
        )}
      </View>
    </ScreenBackground>
  );
}

function CloseHeader({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={styles.closeBtn}
        hitSlop={12}
      >
        <Text style={styles.closeText}></Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.base,
  },
  eyebrow: {
    color: colors.accentGold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
    marginTop: spacing.base,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    marginBottom: spacing.sm,
  },
  scoreInline: {
    color: colors.accentGoldGlow,
    fontWeight: fontWeight.bold,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
    marginBottom: spacing.base,
  },
  loading: {
    marginTop: spacing.lg,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
