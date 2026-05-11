'use client';

import { useMemo, useState } from 'react';
import { LeaderboardRow } from './LeaderboardRow';
import { LeaderboardEmpty } from './LeaderboardEmpty';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import {
  CAMPAIGN_LEVEL_IDS,
  type CampaignLevelId,
} from '@/lib/supabase/queries';
import type { LeaderboardRow as Row } from '@/lib/supabase/types';

type TabKey = 'global' | 'sprint' | 'duels' | 'friends';

interface LeaderboardTabsProps {
  /** Leaderboards for every Logic Garden level (1..30) keyed by id. */
  globalsByLevel: Record<CampaignLevelId, Row[]>;
  sprint: Row[];
  configured: boolean;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'sprint', label: '3-Min Sprint' },
  { key: 'duels', label: 'Duels' },
  { key: 'friends', label: 'Friends' },
];

/**
 * Biome groupings for the Global level pills. Mirrors the iOS app's
 * ACT structure (see src/components/map/mapLayout.ts WORLD_1_ACTS) so
 * the website's leaderboard sub-selector reads the same as the
 * in-game biome treatment. Each biome covers a contiguous 10-level
 * range, capped at the world's 30 levels.
 */
const BIOMES = [
  { id: 'seed-grove', label: 'Seed Grove', from: 1, to: 10 },
  { id: 'moonvine-stream', label: 'Moonvine Stream', from: 11, to: 20 },
  { id: 'oracle-bloom', label: 'Oracle Bloom', from: 21, to: 30 },
] as const;
type BiomeId = (typeof BIOMES)[number]['id'];

/** All 30 level pills, derived once from CAMPAIGN_LEVEL_IDS. */
const LEVEL_PILLS = CAMPAIGN_LEVEL_IDS.map((id, i) => ({
  id,
  label: id.replace('world1-level-', 'L'),
  index: i + 1,
}));

export function LeaderboardTabs({
  globalsByLevel,
  sprint,
  configured,
}: LeaderboardTabsProps) {
  const [active, setActive] = useState<TabKey>('global');
  const [activeBiome, setActiveBiome] = useState<BiomeId>('seed-grove');
  const [activeLevel, setActiveLevel] = useState<CampaignLevelId>(
    'world1-level-1',
  );

  // Resolve the active biome's pill subset + its display label so the
  // 30 levels visually condense to 10 at a time without losing the
  // "scan everything" affordance — clicking the biome row is a single
  // hop between segments.
  const activeBiomeMeta = useMemo(
    () => BIOMES.find((b) => b.id === activeBiome) ?? BIOMES[0],
    [activeBiome],
  );
  const visibleLevelPills = useMemo(
    () =>
      LEVEL_PILLS.filter(
        (p) => p.index >= activeBiomeMeta.from && p.index <= activeBiomeMeta.to,
      ),
    [activeBiomeMeta],
  );

  // Keep activeLevel inside the active biome's range. If the user
  // switches biome while pointing at an out-of-range level, snap to
  // the first level of the new biome.
  const handleBiomeChange = (next: BiomeId) => {
    const meta = BIOMES.find((b) => b.id === next);
    if (!meta) return;
    setActiveBiome(next);
    const currentIndex = LEVEL_PILLS.find((p) => p.id === activeLevel)?.index;
    if (
      currentIndex == null ||
      currentIndex < meta.from ||
      currentIndex > meta.to
    ) {
      const firstInBiome = LEVEL_PILLS.find((p) => p.index === meta.from);
      if (firstInBiome) setActiveLevel(firstInBiome.id);
    }
  };

  const renderRows = (rows: Row[], opts: { showStars?: boolean }) => {
    if (rows.length === 0) {
      return (
        <p className="text-center text-sm text-[var(--color-text-muted)]">
          No entries yet — be the first.
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {rows.map((r) => (
          <LeaderboardRow key={`${r.rank}-${r.user_id}`} row={r} {...opts} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab strip */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-1 rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass-fill)] p-1 backdrop-blur">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-[var(--motion-fast)]',
                active === t.key
                  ? 'bg-[rgba(224,185,106,0.18)] text-[var(--color-gold-glow)] ring-1 ring-[rgba(224,185,106,0.35)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              )}
              aria-pressed={active === t.key}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!configured && <LeaderboardEmpty />}

      {configured && active === 'global' && (
        <GlassCard padding="md" className="!rounded-3xl">
          {/* Biome row — three segments mirror the iOS Saga Map's
              ACT structure: Seed Grove (L1–10), Moonvine Stream
              (L11–20), Oracle Bloom (L21–30). Switching biome snaps
              the level pills below to that biome's range. */}
          <div className="mb-3 flex flex-wrap gap-2">
            {BIOMES.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleBiomeChange(b.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-[var(--motion-fast)]',
                  activeBiome === b.id
                    ? 'bg-[rgba(224,185,106,0.18)] text-[var(--color-gold-glow)] ring-1 ring-[rgba(224,185,106,0.5)]'
                    : 'text-[var(--color-text-muted)] ring-1 ring-[var(--color-glass-border)] hover:text-[var(--color-text)]',
                )}
                aria-pressed={activeBiome === b.id}
              >
                {b.label}
              </button>
            ))}
          </div>
          {/* Level pills — 10 at a time, scoped to the active biome.
              Bigger than before because there's more room without the
              other 20 jostling for space. Tabular nums keep alignment
              tidy between single- and double-digit labels. */}
          <div className="mb-4 flex flex-wrap gap-2">
            {visibleLevelPills.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setActiveLevel(lvl.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-bold tabular-nums transition-all duration-[var(--motion-fast)]',
                  activeLevel === lvl.id
                    ? 'bg-[rgba(224,185,106,0.18)] text-[var(--color-gold-glow)] ring-1 ring-[rgba(224,185,106,0.5)]'
                    : 'bg-[rgba(31,42,68,0.6)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-glass-border)] hover:text-[var(--color-text)]',
                )}
                aria-pressed={activeLevel === lvl.id}
              >
                {lvl.label}
              </button>
            ))}
          </div>
          <p className="section-eyebrow mb-4">
            Global · {activeBiomeMeta.label} · Level{' '}
            {activeLevel.replace('world1-level-', '')}
          </p>
          {renderRows(globalsByLevel[activeLevel] ?? [], { showStars: true })}
        </GlassCard>
      )}

      {configured && active === 'sprint' && (
        <GlassCard padding="md" className="!rounded-3xl">
          <p className="section-eyebrow mb-4">3-Minute Sprint · all-time</p>
          {renderRows(sprint, { showStars: false })}
        </GlassCard>
      )}

      {configured && active === 'duels' && (
        <LeaderboardEmpty
          title="Duel rankings live in the app."
          body="Open Sudoku Evolved to see your duel record, win streak, and head-to-heads with friends."
        />
      )}

      {configured && active === 'friends' && (
        <LeaderboardEmpty
          title="Friend rankings need you signed in."
          body="Sign in inside Sudoku Evolved with Apple or Google to see how you stack up against your friends."
        />
      )}
    </div>
  );
}
