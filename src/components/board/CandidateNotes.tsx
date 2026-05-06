import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontWeight } from '@/theme';

interface Props {
  /** Sorted list of digits 1-9 the player has noted in this cell. */
  notes: number[];
  cellSize: number;
}

/**
 * Displays a 3×3 mini-grid of candidate digits inside a cell. Each slot is
 * fixed at `cellSize/3` so digits stay aligned regardless of which subset
 * is present.
 */
export function CandidateNotes({ notes, cellSize }: Props) {
  const slot = cellSize / 3;
  const fontSize = Math.max(8, cellSize * 0.22);
  return (
    <View style={styles.grid}>
      {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => {
        const has = notes.includes(digit);
        return (
          <View key={digit} style={{ width: slot, height: slot, alignItems: 'center', justifyContent: 'center' }}>
            {has ? (
              <Text style={[styles.note, { fontSize }]}>{digit}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  note: {
    color: colors.cellNoteText,
    fontWeight: fontWeight.medium,
  },
});
