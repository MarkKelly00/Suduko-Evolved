import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';

interface Props {
  children: ReactNode;
  /** Disable safe-area inset (e.g. for full-bleed screens). */
  edgeToEdge?: boolean;
}

/**
 * Wraps a screen in the dark elegant base palette and respects iOS notch/
 * home-indicator insets. Phase 4 will layer an animated Skia background
 * (faint glowing grid lines + ambient particles) on top — for now solid
 * deep navy keeps things calm and readable.
 */
export function ScreenBackground({ children, edgeToEdge = false }: Props) {
  if (edgeToEdge) {
    return <View style={styles.fullBleed}>{children}</View>;
  }
  return (
    <View style={styles.fullBleed}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullBleed: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safeArea: {
    flex: 1,
  },
});
