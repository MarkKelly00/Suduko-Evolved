/**
 * One-time first-launch welcome screen. Shown the first time the player taps
 * Continue (or any "play" entry point) before the first level loads.
 *
 * Persistence: gated by `useProgressStore.hasSeenTutorial`. Both `Begin` and
 * `Skip` mark the flag — the modal will never re-appear on this device after
 * the first interaction.
 *
 * Visual contract: matches the HomeScreen hero — gold serif "Evolved" title,
 * tagline, glass card body, two PremiumButtons. Lives inside an RN `Modal`
 * with `transparent` so the app's existing `ScreenBackground` shows through
 * with a subtle scrim overlay.
 */
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useProgressStore } from '@/game/state/useProgressStore';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';

interface Props {
  /** Controls visibility from the parent. Parent flips this to `false` after
   *  the player picks Begin or Skip. */
  visible: boolean;
  /** Called after the parent's chosen path (Begin or Skip) — typically the
   *  parent dismisses the modal AND advances navigation to the first level. */
  onDismiss: (action: 'begin' | 'skip') => void;
}

const BULLETS = [
  {
    title: 'Tap a cell, enter a number',
    body: 'The number pad fills the cell. Hold the note toggle to pencil in candidates instead.',
  },
  {
    title: 'Mistakes are permanent',
    body: 'Wrong placements count, even if you undo. A clean run earns a crown — chase the Perfect Bloom.',
  },
  {
    title: 'Stars and crowns mark your way',
    body: 'Earn 1–3 stars for a clear, plus a crown for no mistakes, no hints, under target time.',
  },
  {
    title: 'Logic Garden — World 1',
    body: 'Seven landmarks, three acts. Each solve nudges the world a little closer to bloom.',
  },
];

export function TutorialModal({ visible, onDismiss }: Props) {
  const markTutorialSeen = useProgressStore((s) => s.markTutorialSeen);

  const handleBegin = () => {
    markTutorialSeen();
    onDismiss('begin');
  };
  const handleSkip = () => {
    markTutorialSeen();
    onDismiss('skip');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      // Treat hardware back / swipe-down as Skip so the flag still gets set —
      // the modal must never block the player on the first launch.
      onRequestClose={handleSkip}
    >
      <View style={styles.scrim}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.card}>
            <Text style={styles.eyebrow}>WELCOME TO</Text>
            <Text style={styles.title}>Sudoku Evolved</Text>
            <Text style={styles.tagline}>Pure logic. Cinematic feel.</Text>

            <View style={styles.divider} />

            {BULLETS.map((b) => (
              <View key={b.title} style={styles.bullet}>
                <Text style={styles.bulletTitle}>{b.title}</Text>
                <Text style={styles.bulletBody}>{b.body}</Text>
              </View>
            ))}

            <View style={styles.actions}>
              <PremiumButton label="Begin" onPress={handleBegin} variant="primary" />
              <PremiumButton label="Skip" onPress={handleSkip} variant="ghost" />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.base,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    textAlign: 'center',
  },
  title: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    textAlign: 'center',
    textShadowColor: colors.accentGoldGlow,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  bullet: {
    gap: spacing.xxs,
  },
  bulletTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  bulletBody: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.base,
  },
});
