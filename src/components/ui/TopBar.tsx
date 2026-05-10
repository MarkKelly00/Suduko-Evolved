import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSize, fontWeight, letterSpacing, layout, spacing } from '@/theme';
import { hapticsService } from '@/services/haptics/hapticsService';

interface Props {
  title?: string;
  showBack?: boolean;
  rightSlot?: ReactNode;
  /** Override the back navigation behaviour (e.g. confirm dialog). */
  onBack?: () => void;
  /** Visual presentation. `'modal'` swaps the back-chevron for an `×`
   *  close glyph, which is the iOS Human Interface Guidelines pattern
   *  for modally-presented screens. Behaviour is unchanged — the button
   *  still calls `onBack` (or `navigation.goBack()` by default). */
  presentation?: 'push' | 'modal';
}

export function TopBar({
  title,
  showBack = true,
  rightSlot,
  onBack,
  presentation = 'push',
}: Props) {
  const navigation = useNavigation();
  const handleBack = () => {
    hapticsService.selection();
    if (onBack) onBack();
    else if (navigation.canGoBack()) navigation.goBack();
  };
  const isModal = presentation === 'modal';
  return (
    <View style={styles.container}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isModal ? 'Close' : 'Go back'}
            onPress={handleBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            hitSlop={12}
          >
            <Text style={[styles.backIcon, isModal && styles.closeIcon]}>
              {isModal ? '×' : '‹'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.titleSlot}>
        {title ? (
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideRight]}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: layout.topBarHeight,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    minWidth: 44,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  backIcon: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    marginTop: -2,
  },
  // Overrides for the `presentation='modal'` close glyph. The `×`
  // character has slightly different metrics from `‹` so the marginTop
  // and weight need a nudge to keep it visually centered in the circle.
  closeIcon: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginTop: -3,
  },
  titleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
});
