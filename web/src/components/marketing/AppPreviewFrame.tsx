'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PhoneMockup } from '@/components/ui/PhoneMockup';
import { LOGIC_GARDEN } from '@/lib/brand/copy';

type Variant = 'garden' | 'sudoku' | 'time-trial';

interface AppPreviewFrameProps {
  variant?: Variant;
  className?: string;
}

/**
 * Phone mockup with one of three CSS-rendered "app screens":
 *   - garden    Logic Garden saga map with animated path + bloom nodes
 *   - sudoku    Sudoku grid with row-sweep VFX
 *   - time-trial 3-Minute Sprint timer ring
 *
 * No bitmap assets — pure CSS/SVG so it scales cleanly and respects
 * prefers-reduced-motion.
 */
export function AppPreviewFrame({ variant = 'garden', className }: AppPreviewFrameProps) {
  return (
    <PhoneMockup className={className}>
      {variant === 'garden' && <GardenScreen />}
      {variant === 'sudoku' && <SudokuScreen />}
      {variant === 'time-trial' && <TimeTrialScreen />}
    </PhoneMockup>
  );
}

/* ── Garden ─────────────────────────────────────────────────────────── */

function GardenScreen() {
  const filterId = useId();
  const reducedMotion = useReducedMotion();
  const path =
    'M 60 540 C 80 480, 140 460, 160 400 S 100 320, 130 280 S 230 260, 220 200 S 120 160, 160 100 S 290 90, 320 60';

  // 7 landmark dots positioned along the path
  const nodes = [
    { x: 60, y: 540, label: 'Seed Gate', state: 'completed' },
    { x: 158, y: 400, label: 'Glass Sprout Bridge', state: 'completed' },
    { x: 130, y: 280, label: 'Crystal Logic Fountain', state: 'completed' },
    { x: 220, y: 200, label: 'Moonvine Crossing', state: 'current' },
    { x: 160, y: 100, label: 'Golden Ratio Grove', state: 'locked' },
    { x: 280, y: 80, label: 'Oracle Bloom', state: 'locked' },
    { x: 320, y: 60, label: 'Logic Garden Temple', state: 'locked' },
  ] as const;

  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(80% 60% at 50% 30%, rgba(0,229,204,0.08), transparent 70%), linear-gradient(180deg, #070B17, #0A0F1E 50%, #070B17)',
      }}
    >
      {/* Faint grid */}
      <div className="absolute inset-0 opacity-30 logic-grid-bg" />

      {/* Header: world title */}
      <div className="absolute left-0 right-0 top-12 px-4 text-center">
        <p className="section-eyebrow text-[0.55rem] tracking-[0.3em]">World 1</p>
        <h3
          className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-gold-glow)]"
          style={{ textShadow: '0 0 12px rgba(245,213,138,0.4)' }}
        >
          {LOGIC_GARDEN.name}
        </h3>
        <p className="mt-1 text-[0.62rem] italic text-[var(--color-text-muted)]">
          {LOGIC_GARDEN.worldTagline}
        </p>
      </div>

      {/* Path + nodes */}
      <svg viewBox="0 0 380 600" className="absolute inset-0 h-full w-full" fill="none">
        <defs>
          <filter id={`${filterId}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Outer glow */}
        <path
          d={path}
          stroke="rgba(0,229,204,0.4)"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          filter={`url(#${filterId}-glow)`}
          opacity={0.7}
        />
        {/* Locked tail */}
        <path
          d="M 220 200 S 120 160, 160 100 S 290 90, 320 60"
          stroke="rgba(74, 88, 120, 0.5)"
          strokeWidth="2"
          strokeDasharray="3 6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Completed core */}
        {reducedMotion ? (
          <path
            d="M 60 540 C 80 480, 140 460, 160 400 S 100 320, 130 280 S 230 260, 220 200"
            stroke="#F5D58A"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <motion.path
            d="M 60 540 C 80 480, 140 460, 160 400 S 100 320, 130 280 S 230 260, 220 200"
            stroke="#F5D58A"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, ease: [0.16, 1, 0.3, 1] }}
          />
        )}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <g key={i}>
            {n.state === 'current' && !reducedMotion && (
              <motion.circle
                cx={n.x}
                cy={n.y}
                r="14"
                fill="rgba(224,185,106,0.25)"
                animate={{ r: [14, 22, 14], opacity: [0.6, 0.1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.state === 'current' ? 8 : 6}
              fill={
                n.state === 'completed'
                  ? '#58F2B6'
                  : n.state === 'current'
                    ? '#F5D58A'
                    : '#27304A'
              }
              stroke={
                n.state === 'completed'
                  ? '#5BD6A8'
                  : n.state === 'current'
                    ? '#E0B96A'
                    : '#1F2A44'
              }
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>

      {/* Bottom HUD */}
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-2xl border border-[var(--color-glass-border)] bg-[var(--color-glass-fill)] px-3 py-2 backdrop-blur">
        <div>
          <p className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Next
          </p>
          <p className="text-[0.7rem] font-semibold text-[var(--color-text)]">
            Moonvine Crossing
          </p>
        </div>
        <div className="rounded-full bg-[var(--color-gold)] px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-[var(--color-text-on-gold)]">
          Play
        </div>
      </div>
    </div>
  );
}

/* ── Sudoku grid ─────────────────────────────────────────────────────── */

function SudokuScreen() {
  // Sample partially-filled grid; the highlighted row simulates a row sweep.
  const grid: (number | null)[] = [
    5, 3, null, null, 7, null, null, null, null,
    6, null, null, 1, 9, 5, null, null, null,
    null, 9, 8, null, null, null, null, 6, null,
    8, null, null, null, 6, null, null, null, 3,
    4, null, null, 8, null, 3, null, null, 1,
    7, null, null, null, 2, null, null, null, 6,
    null, 6, null, null, null, null, 2, 8, null,
    null, null, null, 4, 1, 9, null, null, 5,
    null, null, null, null, 8, null, null, 7, 9,
  ];
  const givens = new Set([0, 1, 4, 9, 12, 13, 14, 19, 20, 25, 27, 31, 35, 36, 39, 41, 44, 45, 49, 53, 56, 62, 66, 67, 68, 71, 76, 79, 80]);
  const sweepRow = 4;
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        background:
          'radial-gradient(80% 60% at 50% 0%, rgba(123,167,242,0.08), transparent 70%), linear-gradient(180deg, #0E1626, #0B1220)',
      }}
    >
      {/* Header */}
      <div className="px-4 pt-12 pb-3 text-center">
        <p className="section-eyebrow text-[0.55rem] tracking-[0.3em]">Logic Garden · Lvl 7</p>
        <p className="mt-1 text-[0.65rem] text-[var(--color-text-muted)]">02:14 · 0 mistakes</p>
      </div>

      {/* Grid */}
      <div className="relative mx-4 aspect-square overflow-hidden rounded-xl border border-[var(--color-divider)] bg-[#0E1626] shadow-[0_0_40px_-12px_rgba(123,167,242,0.25)]">
        <div className="grid h-full w-full grid-cols-9 grid-rows-9">
          {grid.map((v, i) => {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const thickRight = col === 2 || col === 5;
            const thickBottom = row === 2 || row === 5;
            const isGiven = givens.has(i);
            return (
              <div
                key={i}
                className="relative flex items-center justify-center text-[0.62rem] font-medium"
                style={{
                  borderRight: thickRight
                    ? '1px solid rgba(74,88,120,0.85)'
                    : '0.5px solid rgba(74,88,120,0.35)',
                  borderBottom: thickBottom
                    ? '1px solid rgba(74,88,120,0.85)'
                    : '0.5px solid rgba(74,88,120,0.35)',
                  color: isGiven ? '#ECEFF7' : '#E0B96A',
                }}
              >
                {v}
              </div>
            );
          })}
        </div>

        {/* Row sweep VFX */}
        {!reducedMotion && (
          <motion.div
            className="absolute left-0 right-0 h-[11.11%]"
            style={{
              top: `${sweepRow * 11.11}%`,
              background:
                'linear-gradient(90deg, transparent, rgba(94,231,196,0.45), transparent)',
              boxShadow: '0 0 24px rgba(94,231,196,0.45)',
            }}
            initial={{ opacity: 0, x: '-100%' }}
            animate={{ opacity: [0, 1, 0], x: ['-30%', '110%', '110%'] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              repeatDelay: 1.6,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        )}
      </div>

      {/* Combo HUD */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <div className="rounded-full border border-[rgba(94,231,196,0.4)] bg-[rgba(94,231,196,0.1)] px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-[#86F0C5]">
          Logic Cascade
        </div>
      </div>
    </div>
  );
}

/* ── Time Trial ──────────────────────────────────────────────────────── */

function TimeTrialScreen() {
  const reducedMotion = useReducedMotion();
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{
        background:
          'radial-gradient(70% 50% at 50% 40%, rgba(224,185,106,0.12), transparent 70%), linear-gradient(180deg, #0E1626, #0B1220)',
      }}
    >
      <p className="section-eyebrow text-[0.55rem] tracking-[0.3em] text-[var(--color-text-muted)]">
        Time Trial
      </p>
      <h3 className="mt-1 font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-gold-glow)]">
        3-Minute Sprint
      </h3>

      {/* Ring */}
      <div className="relative mt-6 h-[140px] w-[140px]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="44" stroke="#1F2A44" strokeWidth="6" fill="none" />
          {reducedMotion ? (
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="#F5D58A"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="276"
              strokeDashoffset="69"
            />
          ) : (
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              stroke="#F5D58A"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="276"
              initial={{ strokeDashoffset: 276 }}
              animate={{ strokeDashoffset: 28 }}
              transition={{ duration: 6, ease: [0.16, 1, 0.3, 1], repeat: Infinity }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-[var(--color-text)]">
            2:14
          </p>
          <p className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            remaining
          </p>
        </div>
      </div>

      <div className="mt-6 flex w-full items-center justify-around rounded-2xl border border-[var(--color-glass-border)] bg-[var(--color-glass-fill)] px-3 py-2">
        <Stat label="Score" value="3,420" />
        <Stat label="Filled" value="48" />
        <Stat label="Combo" value="x3" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-text)] tabular-nums">
        {value}
      </p>
      <p className="text-[0.5rem] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
        {label}
      </p>
    </div>
  );
}
