/**
 * Orchestrator that renders all completion VFX over the board. Subscribes
 * to {@link useGameStore.selectLastEvents}, captures each batch into a
 * local effect stack, and renders matching effect components. Each effect
 * self-removes after a generous fixed lifetime — the engine's
 * `lastEvents` is cleared by `CompletionOverlay` after firing audio +
 * haptics so we don't double-trigger here.
 *
 * Position math is owned by this layer because the effects all need to
 * agree on board pixel geometry. Pass `cellSize` from the parent so we
 * stay in lockstep with `SudokuBoard`'s sizing.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useGameStore, selectLastEvents } from '@/game/state/useGameStore';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import type { CompletionEvent } from '@/game/engine';
import { RowSweep } from './RowSweep';
import { ColumnBeam } from './ColumnBeam';
import { BoxBurst } from './BoxBurst';
import { LogicBloom } from './LogicBloom';
import { ComboText } from './ComboText';

interface Props {
  /** Per-cell pixel size (`SudokuBoard` exposes this implicitly via
   *  `layout.boardMaxWidth / 9`; pass the same number you pass to
   *  `<SudokuBoard size={...} />`). */
  boardSize: number;
}

interface ActiveEffect {
  id: string;
  kind: 'row' | 'col' | 'box' | 'puzzle' | 'combo' | 'numberSet';
  /** Region index (rows/cols/box) or digit (numberSet). Unused for puzzle/combo. */
  index?: number;
  /** Combo label string, only set for `kind === 'combo'`. */
  label?: string;
  /** Wall-clock ms when this effect was scheduled. */
  startedAt: number;
  /** ms after `startedAt` when the parent should unmount this effect. */
  ttlMs: number;
}

/** Generous TTLs — slightly longer than each effect's internal animation
 *  so the fade-out always finishes on screen. */
const TTL = {
  row: 700,
  col: 700,
  box: 800,
  puzzle: 1100,
  combo: 900,
  numberSet: 700,
} as const;

/** Stable label picker mirroring `CompletionOverlay`'s legacy strings so
 *  the player sees consistent copy across audio + visuals. */
function comboLabelFor(events: readonly CompletionEvent[]): string | null {
  const nonPuzzle = events.filter((e) => e.type !== 'puzzle');
  if (events.some((e) => e.type === 'puzzle')) return 'Logic Bloom';
  if (nonPuzzle.length >= 4) return 'Perfect Harmony';
  if (nonPuzzle.length === 3) return 'Logic Cascade';
  if (nonPuzzle.length === 2) return 'Triple Flow';
  const first = events[0];
  if (!first) return null;
  switch (first.type) {
    case 'row':
      return 'Row Complete';
    case 'col':
      return 'Column Complete';
    case 'box':
      return 'Box Burst';
    case 'numberSet':
      return `${first.value} Cleared`;
    default:
      return null;
  }
}

export function EffectsLayer({ boardSize }: Props) {
  const events = useGameStore(selectLastEvents);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const [active, setActive] = useState<ActiveEffect[]>([]);
  const idCounter = useRef(0);
  const cellSize = boardSize / 9;

  // When a fresh batch of events comes in, push one effect per event +
  // one combo label. We don't dedupe across batches — each move's events
  // get their own visual.
  useEffect(() => {
    if (events.length === 0) return;
    const now = Date.now();
    const additions: ActiveEffect[] = [];
    for (const ev of events) {
      switch (ev.type) {
        case 'row':
          additions.push({
            id: `row-${ev.index}-${++idCounter.current}`,
            kind: 'row',
            index: ev.index,
            startedAt: now,
            ttlMs: TTL.row,
          });
          break;
        case 'col':
          additions.push({
            id: `col-${ev.index}-${++idCounter.current}`,
            kind: 'col',
            index: ev.index,
            startedAt: now,
            ttlMs: TTL.col,
          });
          break;
        case 'box':
          additions.push({
            id: `box-${ev.index}-${++idCounter.current}`,
            kind: 'box',
            index: ev.index,
            startedAt: now,
            ttlMs: TTL.box,
          });
          break;
        case 'numberSet':
          additions.push({
            id: `ns-${ev.value}-${++idCounter.current}`,
            kind: 'numberSet',
            index: ev.value,
            startedAt: now,
            ttlMs: TTL.numberSet,
          });
          break;
        case 'puzzle':
          additions.push({
            id: `puzzle-${++idCounter.current}`,
            kind: 'puzzle',
            startedAt: now,
            ttlMs: TTL.puzzle,
          });
          break;
      }
    }
    const label = comboLabelFor(events);
    if (label) {
      additions.push({
        id: `combo-${++idCounter.current}`,
        kind: 'combo',
        label,
        startedAt: now,
        ttlMs: TTL.combo,
      });
    }
    setActive((prev) => [...prev, ...additions]);
  }, [events]);

  // Garbage-collect expired effects on a single shared interval so we
  // don't spawn N timers per move.
  useEffect(() => {
    if (active.length === 0) return;
    const handle = setInterval(() => {
      const now = Date.now();
      setActive((prev) => {
        const next = prev.filter((e) => now - e.startedAt < e.ttlMs);
        return next.length === prev.length ? prev : next;
      });
    }, 200);
    return () => clearInterval(handle);
  }, [active.length]);

  const containerStyle = useMemo(
    () => [styles.layer, { width: boardSize, height: boardSize }],
    [boardSize],
  );

  if (active.length === 0) return null;

  return (
    <View pointerEvents="none" style={containerStyle}>
      {active.map((eff) => {
        switch (eff.kind) {
          case 'row':
            return (
              <RowSweep
                key={eff.id}
                rowIndex={eff.index!}
                cellSize={cellSize}
                boardSize={boardSize}
                reducedMotion={reducedMotion}
              />
            );
          case 'col':
            return (
              <ColumnBeam
                key={eff.id}
                colIndex={eff.index!}
                cellSize={cellSize}
                boardSize={boardSize}
                reducedMotion={reducedMotion}
              />
            );
          case 'box':
            return (
              <BoxBurst
                key={eff.id}
                boxIndex={eff.index!}
                cellSize={cellSize}
                reducedMotion={reducedMotion}
              />
            );
          case 'puzzle':
            return (
              <LogicBloom
                key={eff.id}
                boardSize={boardSize}
                reducedMotion={reducedMotion}
              />
            );
          case 'combo':
            return (
              <ComboText
                key={eff.id}
                label={eff.label!}
                boardSize={boardSize}
                reducedMotion={reducedMotion}
              />
            );
          case 'numberSet':
            // Reuse the box burst styling but at full board scale for a
            // softer "all of digit X complete" radial pulse. We could
            // swap in a dedicated effect later; for now this stays subtle.
            return (
              <BoxBurst
                key={eff.id}
                boxIndex={4} // center box — fakes a board-center pulse
                cellSize={cellSize}
                reducedMotion={reducedMotion}
              />
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
});
