import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, layout, radius } from '@/theme';
import { SudokuCell } from './SudokuCell';

interface Props {
  /** Target board size in pixels (square, including outer border). Phase 3
   *  board target ≈ 340–360 px. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Outer border thickness, kept in sync with `styles.outer.borderWidth`. */
const BOARD_BORDER = 2;

/**
 * 9×9 layout rendered as a flat array of 81 `SudokuCell` instances. Each
 * cell subscribes narrowly to the game store so a value/note edit only
 * re-renders the cells whose visible state actually changed (the cell
 * itself, and any peer that flipped highlight/conflict).
 *
 * Sizing math: the bordered outer view places its `borderWidth` *inside*
 * the layout box (RN default), so the inner grid only has
 * `size − 2·BOARD_BORDER` of usable width. Cells must fit within that, so
 * we compute `cellSize` from the inner area, then size the outer view to
 * `cellSize · 9 + 2·BOARD_BORDER`. Without this, the 9th column wraps to a
 * second row and `overflow: hidden` clips it off the right edge.
 */
export function SudokuBoard({ size = layout.boardMaxWidth, style }: Props) {
  const inner = Math.max(0, size - BOARD_BORDER * 2);
  const cellSize = Math.floor(inner / 9);
  const gridSize = cellSize * 9;
  const totalSize = gridSize + BOARD_BORDER * 2;
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
      <View style={[styles.grid, { width: gridSize, height: gridSize }]}>
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
    borderWidth: BOARD_BORDER,
    borderColor: colors.boardLineBold,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
