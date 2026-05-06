import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '@/game/state/useGameStore';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { hapticsService } from '@/services/haptics/hapticsService';
import { audioService } from '@/services/audio/audioService';

interface Props {
  /** When true, controls are disabled (e.g. paused or won). */
  disabled?: boolean;
}

/**
 * 1–9 number pad plus erase, undo, and a note-mode toggle.
 *
 * Phase 3 keeps it as plain Pressable buttons; Phase 4 will add Reanimated
 * press animations + a glow on the active note-mode toggle.
 */
export function NumberPad({ disabled = false }: Props) {
  const placeNumber = useGameStore((s) => s.placeNumber);
  const erase = useGameStore((s) => s.erase);
  const undo = useGameStore((s) => s.undo);
  const toggleNoteMode = useGameStore((s) => s.toggleNoteMode);
  const noteMode = useGameStore((s) => s.noteMode);
  const undoDepth = useGameStore((s) => s.active?.undoStack.length ?? 0);

  const handleNumber = (n: number) => {
    if (disabled) return;
    hapticsService.selection();
    if (noteMode) audioService.playNote();
    else audioService.playPlace();
    placeNumber(n);
  };

  return (
    <View style={styles.wrapper} accessibilityRole="toolbar">
      <View style={styles.row}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <PadButton
            key={n}
            label={String(n)}
            onPress={() => handleNumber(n)}
            disabled={disabled}
            size="square"
          />
        ))}
      </View>
      <View style={styles.controlsRow}>
        <PadButton
          label={noteMode ? 'Notes ON' : 'Notes'}
          onPress={() => {
            hapticsService.light();
            toggleNoteMode();
          }}
          disabled={disabled}
          highlighted={noteMode}
          size="wide"
        />
        <PadButton
          label="Erase"
          onPress={() => {
            if (disabled) return;
            hapticsService.light();
            audioService.playErase();
            erase();
          }}
          disabled={disabled}
          size="wide"
        />
        <PadButton
          label={`Undo${undoDepth > 0 ? ` (${undoDepth})` : ''}`}
          onPress={() => {
            if (disabled) return;
            hapticsService.light();
            undo();
          }}
          disabled={disabled || undoDepth === 0}
          size="wide"
        />
      </View>
    </View>
  );
}

interface PadButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  size: 'square' | 'wide';
}

function PadButton({ label, onPress, disabled, highlighted, size }: PadButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        size === 'square' ? styles.squareButton : styles.wideButton,
        highlighted && styles.buttonHighlighted,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          size === 'square' ? styles.numberLabel : styles.controlLabel,
          highlighted && styles.labelHighlighted,
          disabled && styles.labelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  button: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareButton: {
    flex: 1,
    aspectRatio: 1,
    minHeight: 44,
  },
  wideButton: {
    flex: 1,
    height: 48,
  },
  buttonHighlighted: {
    backgroundColor: colors.accentGold,
    borderColor: colors.accentGoldGlow,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  numberLabel: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  controlLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  labelHighlighted: {
    color: colors.textOnGold,
  },
  labelDisabled: {
    color: colors.textDim,
  },
});
