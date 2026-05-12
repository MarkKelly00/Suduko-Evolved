/**
 * AppErrorBoundary
 *
 * Top-level error boundary mounted around the entire app tree in
 * `App.tsx`. Catches JS render errors that would otherwise propagate
 * through RN's bridge to native, where on iOS they can become a fatal
 * `RCTExceptionsManager.reportFatalException` call that crashes the
 * app on launch (we hit this in build 16 — a transient render-time
 * issue in a globally-mounted banner brought down the whole shell).
 *
 * The fallback is intentionally minimal: a dark background with a
 * "Something went wrong" message and a Try Again button. We don't have
 * navigation here — the boundary catches errors that might prevent
 * the navigator from rendering at all. Tapping Try Again clears the
 * error state and re-renders; if the underlying problem is transient
 * (e.g. a race between auth + store hydration), the second mount may
 * succeed. If it's deterministic, the user sees the same screen and
 * can force-quit the app.
 *
 * Logged via `__DEV__` console only — production runs without remote
 * telemetry for now. We DO surface the error message in the fallback
 * so beta testers can screenshot it for crash reports.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, fontWeight, spacing } from '@/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[AppErrorBoundary] caught:', error, info.componentStack);
    }
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body} numberOfLines={6}>
          {error.message || String(error)}
        </Text>
        <Pressable
          onPress={this.handleReset}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>{'Try again'}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  cta: {
    borderWidth: 1,
    borderColor: colors.accentGold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  ctaPressed: {
    opacity: 0.7,
  },
  ctaText: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
