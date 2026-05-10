import React, { useEffect, useState } from 'react';
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
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/profile/Avatar';
import { useAuthStore } from '@/game/state/useAuthStore';
import { friendService } from '@/services/supabase';
import { duelInviteService } from '@/services/duel';
import { shareDuelInviteLink } from '@/services/duel/shareDuelInvite';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import { hapticsService } from '@/services/haptics/hapticsService';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

/**
 * Pick a friend to challenge to a duel. Sends a `create_friend_duel` RPC
 * which materializes a duel_invite row. The friend will see it in their
 * inbox / via realtime; for MVP we don't push-notify yet.
 */
export default function FriendDuelPickerScreen() {
  const route = useRoute<RootRouteProp<'FriendDuelPicker'>>();
  const navigation = useNavigation<RootStackNavigation>();
  const me = useAuthStore((s) => s.profile);
  const [friends, setFriends] = useState<
    Awaited<ReturnType<typeof friendService.getFriends>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await friendService.getFriends(me?.id);
      if (!cancelled) {
        setFriends(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  const onChallenge = async (friendId: string, friendName: string) => {
    if (submittingId) return;
    setSubmittingId(friendId);
    try {
      await duelInviteService.createFriendDuel(friendId, route.params.mode);
      hapticsService.success();
      setSuccess(`Challenge sent to ${friendName}.`);
      setTimeout(() => navigation.goBack(), 700);
    } catch (err) {
      setSuccess(
        err instanceof Error ? err.message : 'Could not send challenge.',
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const onShareLink = () => {
    // shareDuelInviteLink handles RPC + Share + error visibility
    // (Alert on failure, silent on user-cancel). On a completed share we
    // pop back to the previous screen.
    void shareDuelInviteLink(route.params.mode, {
      onSuccess: () => navigation.goBack(),
    });
  };

  if (loading) {
    return (
      <ScreenBackground>
        <TopBar title="Challenge friend" presentation="modal" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <TopBar title="Challenge friend" presentation="modal" />
      <View style={styles.body}>
        {success ? (
          <GlassCard style={styles.toast}>
            <Text style={styles.toastText}>{success}</Text>
          </GlassCard>
        ) : null}
        <FlatList
          data={friends}
          keyExtractor={(f) => f.profile.id}
          ListEmptyComponent={
            <GlassCard>
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptyBody}>
                Add friends to challenge them directly, or share an invite link
                with anyone.
              </Text>
              <Pressable onPress={onShareLink} style={styles.linkInline} hitSlop={8}>
                <Text style={styles.linkInlineText}>Share invite link →</Text>
              </Pressable>
            </GlassCard>
          }
          renderItem={({ item }) => {
            const name = item.profile.display_name ?? item.profile.username ?? 'Friend';
            const sending = submittingId === item.profile.id;
            return (
              <Pressable
                onPress={() => onChallenge(item.profile.id, name)}
                disabled={!!submittingId}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Avatar
                  size="md"
                  url={item.profile.avatar_url}
                  fallbackName={name}
                />
                <View style={styles.rowMid}>
                  <Text style={styles.rowName}>{name}</Text>
                  {item.profile.username ? (
                    <Text style={styles.rowHandle}>@{item.profile.username}</Text>
                  ) : null}
                </View>
                <Text style={styles.rowCta}>
                  {sending ? 'Sending…' : 'Duel'}
                </Text>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.list}
        />
        <Pressable onPress={onShareLink} hitSlop={8} style={styles.shareLink}>
          <Text style={styles.shareLinkText}>or share an invite link</Text>
        </Pressable>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toast: {
    marginBottom: spacing.base,
  },
  toastText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  list: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowMid: { flex: 1 },
  rowName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  rowHandle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  rowCta: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
    fontSize: fontSize.xs,
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
  },
  linkInline: {
    marginTop: spacing.sm,
  },
  linkInlineText: {
    color: colors.accentGold,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  shareLink: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  shareLinkText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
