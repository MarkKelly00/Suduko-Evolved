import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontWeight } from '@/theme';

interface Props {
  /** Sorted list of digits 1-9 the player has noted in this cell. */
  notes: number[];
  /** Outer cell pixel size (square). The note grid sizes itself off the
   *  inner content area so it never bleeds across cell borders. */
  cellSize: number;
}

/**
 * 3×3 mini-grid of candidate digits inside a cell.
 *
 * Sizing is explicit (not `flex: 1`) so the note grid cannot grow past
 * the cell's interior. We subtract a small inset from `cellSize` to leave
 * room for the cell's borders + any selection halo, then divide the
 * remaining inner box into nine fixed slots. The grid clips to its own
 * bounds so a too-tall glyph (e.g. an 8 with its descender) cannot
 * visually overflow into the cell below.
 *
 * Font sizing is clamped: small enough that 9 digits comfortably fit even
 * when the per-cell render size is the smallest the board ever uses,
 * while still being legible on Pro Max screens.
 */
export function CandidateNotes({ notes, cellSize }: Props) {
  // Inset shrinks the working area by ~10% so notes sit clearly inside
  // the cell, away from borders and any same-row/col highlight wash.
  const inset = Math.max(2, cellSize * 0.06);
  const innerSize = Math.max(0, cellSize - inset * 2);
  const slot = innerSize / 3;
  // Clamp note text so even large cells stay readable without a digit
  // ever spilling into a neighbor. Tighter line height keeps tall glyphs
  // (3, 5, 8, 9) inside their slot.
  const fontSize = Math.max(7, Math.min(11, cellSize * 0.2));
  const lineHeight = slot;

  return (
    <View
      style={[
        styles.frame,
        { width: innerSize, height: innerSize, padding: 0 },
      ]}
    >
      {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => {
        const has = notes.includes(digit);
        return (
          <View key={digit} style={[styles.slot, { width: slot, height: slot }]}>
            {has ? (
              <Text
                style={[
                  styles.note,
                  { fontSize, lineHeight },
                ]}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {digit}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  note: {
    color: colors.cellNoteText,
    fontWeight: fontWeight.medium,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
