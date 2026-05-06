import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import {
  selectCellConflict,
  selectCellGiven,
  selectCellNotes,
  selectCellValue,
  useGameStore,
  type GameState,
} from '@/game/state/useGameStore';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { colors, fontFamily, fontWeight } from '@/theme';
import { CandidateNotes } from './CandidateNotes';
import { hapticsService } from '@/services/haptics/hapticsService';
import { audioService } from '@/services/audio/audioService';

interface Props {
  row: number;
  col: number;
  size: number;
}

/**
 * One Sudoku cell. Subscribes to the game store with narrow selectors so
 * unrelated state changes don't trigger a re-render. The 3×3 box separators
 * are drawn here (not on the board container) so the layout stays simple.
 */
export const SudokuCell = React.memo(function SudokuCell({ row, col, size }: Props) {
  const value = useGameStore(selectCellValue(row, col));
  const notes = useGameStore(selectCellNotes(row, col));
  const isGiven = useGameStore(selectCellGiven(row, col));
  const conflict = useGameStore(selectCellConflict(row, col));

  // Bundle the selection-related flags into one shallow-compared selector to
  // avoid four separate subscriptions per cell.
  const highlights = useGameStore(
    useShallow((s: GameState) => deriveHighlights(s, row, col)),
  );

  const select = useGameStore((s) => s.selectCell);
  const colorblindMode = useSettingsStore((s) => s.colorblindMode);
  const highContrast = useSettingsStore((s) => s.highContrast);

  const handlePress = useCallback(() => {
    hapticsService.selection();
    audioService.playSelectCell();
    select(row, col);
  }, [select, row, col]);

  const bgColor = backgroundFor(highlights, conflict, colorblindMode);
  const borderRight = (col + 1) % 3 === 0 && col !== 8;
  const borderBottom = (row + 1) % 3 === 0 && row !== 8;
  const numberColor = isGiven
    ? highContrast
      ? colors.text
      : colors.cellGiven
    : conflict
      ? colors.mistake
      : colors.cellUserValue;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={describeCell(row, col, value, isGiven)}
      onPress={handlePress}
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          backgroundColor: bgColor,
          borderRightWidth: borderRight ? 2 : 1,
          borderBottomWidth: borderBottom ? 2 : 1,
          borderRightColor: borderRight ? colors.boardLineBold : colors.boardLine,
          borderBottomColor: borderBottom ? colors.boardLineBold : colors.boardLine,
        },
      ]}
    >
      {value != null ? (
        <Text style={[styles.value, { color: numberColor, fontSize: size * 0.5 }]}>
          {value}
        </Text>
      ) : notes.length > 0 ? (
        <CandidateNotes notes={notes} cellSize={size} />
      ) : (
        <View />
      )}
      {highlights.markerForColorblind && colorblindMode ? (
        <View style={styles.cbMarker} />
      ) : null}
    </Pressable>
  );
});

interface Highlights {
  isSelected: boolean;
  inSameRow: boolean;
  inSameCol: boolean;
  inSameBox: boolean;
  isSameNumber: boolean;
  /** Stable tag we expose for the colorblind dot in the corner. */
  markerForColorblind: boolean;
}

function deriveHighlights(s: GameState, row: number, col: number): Highlights {
  const sel = s.active?.selected;
  if (!sel) {
    return {
      isSelected: false,
      inSameRow: false,
      inSameCol: false,
      inSameBox: false,
      isSameNumber: false,
      markerForColorblind: false,
    };
  }
  const isSelected = sel.row === row && sel.col === col;
  const inSameRow = !isSelected && sel.row === row;
  const inSameCol = !isSelected && sel.col === col;
  const sameBox =
    Math.floor(sel.row / 3) === Math.floor(row / 3) &&
    Math.floor(sel.col / 3) === Math.floor(col / 3);
  const inSameBox = !isSelected && !inSameRow && !inSameCol && sameBox;
  const selValue = s.active?.grid[sel.row]?.[sel.col] ?? null;
  const myValue = s.active?.grid[row]?.[col] ?? null;
  const isSameNumber = !isSelected && selValue != null && selValue === myValue;
  return {
    isSelected,
    inSameRow,
    inSameCol,
    inSameBox,
    isSameNumber,
    markerForColorblind: isSameNumber,
  };
}

function backgroundFor(h: Highlights, conflict: boolean, _colorblind: boolean): string {
  if (conflict) return colors.cellConflict;
  if (h.isSelected) return colors.cellSelected;
  if (h.isSameNumber) return colors.cellSameNumber;
  if (h.inSameRow || h.inSameCol || h.inSameBox) return colors.cellHighlighted;
  return 'transparent';
}

function describeCell(row: number, col: number, value: number | null, isGiven: boolean): string {
  const valDesc = value != null ? `value ${value}` : 'empty';
  const givenDesc = isGiven ? ', given' : '';
  return `Row ${row + 1}, column ${col + 1}, ${valDesc}${givenDesc}`;
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  value: {
    fontFamily: fontFamily.text,
    fontWeight: fontWeight.semibold,
  },
  cbMarker: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
});
