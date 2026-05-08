import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useAuthStore } from '@/game/state/useAuthStore';
import { useAuthGate } from '@/components/auth/AuthGate';
import { duelInviteService } from '@/services/duel';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

type Phase =
  | { kind: 'loading' }
  | { kind: 'auth_required' }
  | { kind: 'redeeming' }
  | { kind: 'error'; message: string };

/**
 * Universal-link entry point. The deep link handler navigates here with
 * the invite_code. We:
 *   1. Require auth (gate to AuthScreen, return after login).
 *   2. Call redeem_duel_invite.
 *   3. Navigate to DuelLobby on success, or show a graceful error.
 *
 * Errors include: invite expired, already used, addressed to a different
 * player. Each shows a clear state with a "Quick Duel instead" fallback.
 */
export default function DuelInviteJoinScreen() {
  const route = useRoute<RootRouteProp<'DuelInviteJoin'>>();
  const navigation = useNavigation<RootStackNavigation>();
  const me = useAuthStore((s) => s.profile);
  const requireAuth = useAuthGate();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  useEffect(() => {
    if (!me) {
      setPhase({ kind: 'auth_required' });
      return;
    }
    let cancelled = false;
    setPhase({ kind: 'redeeming' });
    void (async () => {
      try {
        const result = await duelInviteService.redeemDuelInvite(
          route.params.inviteCode,
        );
        if (cancelled) return;
        navigation.replace('DuelLobby', {
          roomId: result.roomId,
          puzzleSeed: result.puzzleSeed,
          mode: result.mode,
          startAt: result.startAt,
        });
      } catch (err) {
        if (cancelled) return;
        setPhase({
          kind: 'error',
          message:
            err instanceof Error ? err.message : 'Could not join the duel.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.id, route.params.inviteCode, navigation, me]);

  return (
    <ScreenBackground>
      <TopBar title="Duel Invite" />
      <View style={styles.body}>
        <GlassCard style={styles.card}>
          {phase.kind === 'loading' || phase.kind === 'redeeming' ? (
            <>
              <ActivityIndicator color={colors.accentGold} size="large" />
              <Text style={styles.headline}>Joining duel…</Text>
              <Text style={styles.body2}>
                Verifying invite & preparing the same puzzle seed.
              </Text>
            </>
          ) : phase.kind === 'auth_required' ? (
            <>
              <Text style={styles.headline}>Sign in to accept</Text>
              <Text style={styles.body2}>
                Sign in so we know who you’re challenging — your invite is
                saved and we’ll redeem it after.
              </Text>
              <PremiumButton
                label="Sign in"
                variant="primary"
                onPress={() =>
                  requireAuth(
                    () => {
                      // Re-trigger by navigating to ourselves.
                      navigation.replace('DuelInviteJoin', {
                        inviteCode: route.params.inviteCode,
                      });
                    },
                    {
                      contextSubtitle: 'Sign in to accept the duel invite.',
                    },
                  )
                }
              />
            </>
          ) : (
            <>
              <Text style={styles.headline}>Couldn’t join</Text>
              <Text style={styles.body2}>{phase.message}</Text>
              <PremiumButton
                label="Quick duel instead"
                variant="primary"
                onPress={() =>
                  navigation.replace('Matchmaking', { mode: 'sprint-3min' })
                }
              />
              <PremiumButton
                label="Back"
                variant="ghost"
                onPress={() => navigation.popToTop()}
                compact
              />
            </>
          )}
        </GlassCard>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.base,
  },
  headline: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    textAlign: 'center',
  },
  body2: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: fontSize.sm * 1.45,
  },
});
