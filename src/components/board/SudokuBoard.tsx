import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, layout, radius } from '@/theme';
import { SudokuCell } from './SudokuCell';

interface Props {
  /** Total board size in pixels (square). Phase 3 board target ≈ 340–360 px. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * 9×9 layout rendered as a flat array of 81 `SudokuCell` instances. Each
 * cell subscribes narrowly to the game store so a value/note edit only
 * re-renders the cells whose visible state actually changed (the cell
 * itself, and any peer that flipped highlight/conflict).
 */
export function SudokuBoard({ size = layout.boardMaxWidth, style }: Props) {
  const cellSize = Math.floor(size / 9);
  const totalSize = cellSize * 9;
  const cells = useMemo(() => {
    const out: { row: number; col: number }[] = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) out.push({ row: r, col: c });
    return out;
  }, []);

  return (
    <View
      style={[
        styles.outer,
        {
          width: totalSize,
          height: totalSize,
        },
        style,
      ]}
    >
      <View style={styles.grid}>
        {cells.map(({ row, col }) => (
          <SudokuCell key={`${row}-${col}`} row={row} col={col} size={cellSize} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.boardBg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.boardLineBold,
    overflow: 'hidden',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
