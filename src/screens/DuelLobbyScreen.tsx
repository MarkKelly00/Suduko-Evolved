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
 * Pre-game lobby. Both players land here after matchmaking succeeds; we
 * sync the countdown to `start_at` (server-authoritative timestamp).
 *
 * If the opponent disconnects before start, we extend a short grace
 * window before forfeiting them.
 */
export default function DuelLobbyScreen() {
  const route = useRoute<RootRouteProp<'DuelLobby'>>();
  const navigation = useNavigation<RootStackNavigation>();
  const me = useAuthStore((s) => s.profile);
  const { roomId, puzzleSeed, mode, startAt } = route.params;
  const modeMeta = useMemo(() => getTimeTrialMode(mode), [mode]);

  const [countdown, setCountdown] = useState<number>(() =>
    Math.max(0, Math.ceil((new Date(startAt).getTime() - Date.now()) / 1000)),
  );
  const [bundle, setBundle] = useState<Awaited<
    ReturnType<typeof duelService.getDuelRoom>
  > | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  // Fetch participants for both avatars.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const b = await duelService.getDuelRoom(roomId);
      if (!cancelled) setBundle(b);
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Subscribe to room status — if it transitions to 'completed' before we
  // get there (e.g. opponent forfeited), we route directly to results.
  useEffect(() => {
    const unsub = duelRealtimeService.subscribeRoomState(roomId, (room) => {
      if (room.status === 'completed' || room.status === 'cancelled') {
        navigation.replace('DuelResults', { roomId });
      }
    });
    return () => unsub();
  }, [navigation, roomId]);

  // 1Hz countdown.
  useEffect(() => {
    const target = new Date(startAt).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0 && !autoStarted) {
        setAutoStarted(true);
        navigation.replace('DuelGame', { roomId, puzzleSeed, mode });
      }
    }, 250);
    return () => clearInterval(interval);
  }, [startAt, autoStarted, navigation, roomId, puzzleSeed, mode]);

  const onForfeit = async () => {
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
  const self = bundle ? bundle.participants.find((p) => p.user_id === me?.id) : null;

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
            label={opponent ? 'Rival' : 'Connecting…'}
          />
        </GlassCard>

        <GlassCard style={styles.countdownCard}>
          <Text style={styles.eyebrow}>SAME GRID · SAME CLOCK</Text>
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.modeName}>{modeMeta?.name ?? mode}</Text>
          {!opponent ? (
            <View style={styles.connectingRow}>
              <ActivityIndicator color={colors.textMuted} size="small" />
              <Text style={styles.connectingText}>Preparing same puzzle seed…</Text>
            </View>
          ) : (
            <Text style={styles.preparing}>Both players ready.</Text>
          )}
        </GlassCard>

        <View style={styles.actions}>
          <PremiumButton label="Leave duel" variant="ghost" onPress={onForfeit} />
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
  actions: {
    gap: spacing.sm,
  },
});
