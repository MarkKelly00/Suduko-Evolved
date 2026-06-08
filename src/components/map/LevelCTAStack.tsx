/**
 * LevelCTAStack
 *
 * Three-button column at the bottom of the LevelPreviewModal:
 *   • Play Level     (primary, gold) — closes modal + launches gameplay
 *   • Challenge Friend (secondary) — gates auth, opens friend picker, or
 *                                     surfaces a "coming soon" toast
 *   • View Leaderboard (ghost)     — navigates to Leaderboard screen
 *                                     filtered to this level
 *
 * The locked-level variant of the modal renders a different CTA stack
 * inline; this component handles the unlocked case only.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PremiumButton } from '@/components/ui/PremiumButton';

interface Props {
  isCompleted: boolean;
  onPlay: () => void;
  onChallengeFriend: () => void;
  onViewLeaderboard: () => void;
  /** Overrides the primary CTA label. Used for "Reclaim Crown" when a rival
   *  now leads a level the player had crowned. Defaults to the
   *  Play Level / Play again copy. */
  primaryLabel?: string;
}

export function LevelCTAStack({
  isCompleted,
  onPlay,
  onChallengeFriend,
  onViewLeaderboard,
  primaryLabel,
}: Props) {
  return (
    <View style={styles.stack}>
      <PremiumButton
        label={primaryLabel ?? (isCompleted ? 'Play again' : 'Play Level')}
        variant="primary"
        onPress={onPlay}
        accessibilityHint="Closes this preview and starts the puzzle."
      />
      <PremiumButton
        label="Challenge a friend"
        variant="secondary"
        onPress={onChallengeFriend}
        accessibilityHint="Opens your friends list with this level pre-selected."
      />
      <PremiumButton
        label="View leaderboard"
        variant="ghost"
        compact
        onPress={onViewLeaderboard}
        accessibilityHint="Opens the global leaderboard for this level."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
});
