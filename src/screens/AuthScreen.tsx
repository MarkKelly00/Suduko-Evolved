import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { SocialButton } from '@/components/auth/SocialButton';
import { InlineToast } from '@/components/ui/InlineToast';
import { useAuthStore } from '@/game/state/useAuthStore';
import { authService } from '@/services/supabase';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type { RootStackNavigation, RootRouteProp } from '@/app/navigation/routes';

type Provider = 'apple' | 'google' | 'guest';

export default function AuthScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const route = useRoute<RootRouteProp<'Auth'>>();
  const subtitle =
    route.params?.contextSubtitle ??
    'Sign in to sync progress, challenge friends, and join leaderboards.';

  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);

  const setStatus = useAuthStore((s) => s.setStatus);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setIsOnboarding = useAuthStore((s) => s.setIsOnboarding);

  // No automatic dismissal logic — App.tsx's onAuthStateChange handler does
  // the heavy lifting. We only handle UX errors and provider invocations here.

  const handleSignIn = async (provider: 'apple' | 'google') => {
    if (pending) return;
    setPending(provider);
    setError(null);
    try {
      const session =
        provider === 'apple'
          ? await authService.signInWithApple()
          : await authService.signInWithGoogle();
      setSession(session);
      setUser(session.user);
      const { profile, isOnboarding } = await authService.ensureProfile(session.user);
      setProfile(profile);
      setIsOnboarding(isOnboarding);
      setStatus('authenticated');

      // Run any pendingAction queued by AuthGate, then dismiss.
      const pendingAction = useAuthStore.getState().pendingAction;
      useAuthStore.getState().setPendingAction(null);

      if (isOnboarding) {
        navigation.replace('EditProfile');
      } else {
        navigation.goBack();
      }
      // Run the pending action after the modal animates away.
      if (pendingAction) {
        setTimeout(() => {
          try {
            pendingAction();
          } catch (err) {
            if (__DEV__) console.warn('[AuthScreen] pendingAction failed', err);
          }
        }, 320);
      }
    } catch (err) {
      const message = humanizeError(err);
      if (message) {
        setError(message);
        setErrorNonce((n) => n + 1);
      }
    } finally {
      setPending(null);
    }
  };

  const handleGuest = () => {
    if (pending) return;
    useAuthStore.getState().setPendingAction(null);
    setStatus('guest');
    navigation.goBack();
  };

  return (
    <ScreenBackground>
      <View style={styles.scrim} />
      <TopBar title="Sign in" />
      <View style={styles.body}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>SUDOKU EVOLVED</Text>
          <Text style={styles.heading}>Make it social</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.buttons}>
          {Platform.OS === 'ios' ? (
            <SocialButton
              label="Continue with Apple"
              variant="primary"
              loading={pending === 'apple'}
              disabled={pending != null && pending !== 'apple'}
              leadingIcon={<Text style={styles.appleGlyph}></Text>}
              onPress={() => handleSignIn('apple')}
            />
          ) : null}
          <SocialButton
            label="Continue with Google"
            variant={Platform.OS === 'ios' ? 'secondary' : 'primary'}
            loading={pending === 'google'}
            disabled={pending != null && pending !== 'google'}
            leadingIcon={<Text style={styles.googleGlyph}>G</Text>}
            onPress={() => handleSignIn('google')}
          />
          <SocialButton
            label="Continue as guest"
            variant="ghost"
            disabled={pending != null}
            onPress={handleGuest}
          />
        </View>

        {error ? (
          <View style={styles.errorSlot}>
            <InlineToast variant="error" message={error} nonce={errorNonce} />
          </View>
        ) : null}

        <Text style={styles.legal}>
          By continuing you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </ScreenBackground>
  );
}

function humanizeError(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (!msg) return null;
  // Apple reports a structured "ERR_REQUEST_CANCELED" code; iOS dialog cancels
  // shouldn't show an inline toast.
  if (
    msg.includes('canceled') ||
    msg.includes('cancelled') ||
    msg.includes('ERR_REQUEST_CANCELED') ||
    msg.includes('SIGN_IN_CANCELLED')
  ) {
    return null;
  }
  if (msg.includes('Network')) return "Couldn't reach servers — try again.";
  if (msg.includes('not configured')) {
    return 'Auth is not configured yet — running as guest is fine.';
  }
  if (msg.includes('not available')) {
    return msg;
  }
  return 'Sign-in failed. Please try again.';
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accentGold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
  },
  heading: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    textShadowColor: 'rgba(245, 213, 138, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: fontSize.base * 1.4,
  },
  buttons: {
    gap: spacing.base,
    marginTop: spacing.lg,
  },
  errorSlot: {
    marginTop: spacing.sm,
  },
  legal: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: 'auto',
  },
  appleGlyph: {
    color: colors.textOnGold,
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },
  googleGlyph: {
    color: colors.text,
    fontSize: 18,
    fontWeight: fontWeight.heavy,
    fontFamily: fontFamily.display,
  },
});
