import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import {
  selectCellConflict,
  selectCellGiven,
  selectCellMistake,
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
  const mistake = useGameStore(selectCellMistake(row, col));

  // Per-cell placement / mistake micro-feedback. Drives a tiny scale pop
  // for a correct placement, and a brief shake for a mistake. Lives on
  // the UI thread via Reanimated shared values.
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const prevValueRef = useRef<number | null>(value);
  const prevMistakeRef = useRef<boolean>(mistake);
  useEffect(() => {
    const prev = prevValueRef.current;
    if (value != null && value !== prev && !isGiven) {
      // A new value just landed in this cell.
      if (mistake) {
        if (!reducedMotion) {
          shakeX.value = withSequence(
            withTiming(-3, { duration: 40, easing: Easing.out(Easing.quad) }),
            withTiming(3, { duration: 60, easing: Easing.linear }),
            withTiming(-2, { duration: 50, easing: Easing.linear }),
            withTiming(0, { duration: 40, easing: Easing.in(Easing.quad) }),
          );
        }
      } else {
        if (!reducedMotion) {
          scale.value = withSequence(
            withTiming(1.18, { duration: 100, easing: Easing.out(Easing.quad) }),
            withTiming(1, { duration: 160, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
          );
        }
      }
    }
    prevValueRef.current = value;
    prevMistakeRef.current = mistake;
  }, [value, mistake, isGiven, reducedMotion, scale, shakeX]);
  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shakeX.value }],
  }));

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

  const bgColor = backgroundFor(highlights, conflict, mistake, colorblindMode);
  const borderRight = (col + 1) % 3 === 0 && col !== 8;
  const borderBottom = (row + 1) % 3 === 0 && row !== 8;
  // Text color hierarchy: givens are immutable & always neutral; cells that
  // currently hold a wrong value (mistake) read red; everything else is the
  // warm gold "this is your placement" tone. Conflicts (transient peer
  // highlight from the most recent placement) are shown via background only,
  // so they don't change the text of unrelated correct cells.
  const numberColor = isGiven
    ? highContrast
      ? colors.text
      : colors.cellGiven
    : mistake
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
        <Animated.Text
          style={[
            styles.value,
            { color: numberColor, fontSize: size * 0.5 },
            animatedTextStyle,
          ]}
        >
          {value}
        </Animated.Text>
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

function backgroundFor(
  h: Highlights,
  conflict: boolean,
  mistake: boolean,
  _colorblind: boolean,
): string {
  // Priority (top wins):
  //  1. selected — gold-tinted, strongest cue.
  //  2. transient conflict — red-tinted, fades when the player moves on
  //     because `selectCell` clears the conflicts list.
  //  3. persistent mistake — softer red so the player can still scan the
  //     board, but it's clearly wrong.
  //  4. same-number peek — teal-tinted, encourages logical scanning.
  //  5. row/col/box of selected — subtle gold wash.
  if (h.isSelected) return colors.cellSelected;
  if (conflict) return colors.cellConflict;
  if (mistake) return colors.cellMistakeBg;
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
