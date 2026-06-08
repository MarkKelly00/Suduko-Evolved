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
  /** Leaderboards for every campaign level (1..60 across both worlds) keyed
   *  by level id. */
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
 * Worlds → acts (the "biome" tier). Mirrors the iOS Saga Atlas:
 * Logic Garden (levels 1–30) and Astral Nexus (31–60). Each act covers a
 * contiguous 10-level range; the top-level World selector keeps the act/level
 * rows uncluttered (3 acts / 10 levels per world) and scales to future worlds.
 */
const WORLDS = [
  {
    id: 'world1',
    label: 'Logic Garden',
    accent: 'gold' as const,
    biomes: [
      { id: 'seed-grove', label: 'Seed Grove', from: 1, to: 10 },
      { id: 'moonvine-stream', label: 'Moonvine Stream', from: 11, to: 20 },
      { id: 'oracle-bloom', label: 'Oracle Bloom', from: 21, to: 30 },
    ],
  },
  {
    id: 'world2',
    label: 'Astral Nexus',
    accent: 'violet' as const,
    biomes: [
      { id: 'prism-causeway', label: 'Prism Causeway', from: 31, to: 40 },
      { id: 'starfall-archive', label: 'Starfall Archive', from: 41, to: 50 },
      { id: 'celestial-engine', label: 'Celestial Engine', from: 51, to: 60 },
    ],
  },
] as const;
type WorldId = (typeof WORLDS)[number]['id'];
type BiomeId = (typeof WORLDS)[number]['biomes'][number]['id'];

const ALL_BIOMES = WORLDS.flatMap((w) =>
  w.biomes.map((b) => ({ ...b, worldId: w.id, worldLabel: w.label })),
);

/** All level pills (1–60), derived once from CAMPAIGN_LEVEL_IDS. `index` is the
 *  global level number; the label strips the `worldN-level-` prefix → "L31". */
const LEVEL_PILLS = CAMPAIGN_LEVEL_IDS.map((id, i) => ({
  id,
  label: `L${id.split('-').pop()}`,
  index: i + 1,
}));

/** Active-chip classes for the World tier — gold for Logic Garden, a hint of
 *  violet for Astral Nexus (its cosmic accent), without disturbing the
 *  gold/navy brand of the act + level chips below. */
function worldActiveClass(accent: 'gold' | 'violet'): string {
  return accent === 'violet'
    ? 'bg-[rgba(157,123,255,0.18)] text-[#C4B5FF] ring-1 ring-[rgba(157,123,255,0.5)]'
    : 'bg-[rgba(224,185,106,0.18)] text-[var(--color-gold-glow)] ring-1 ring-[rgba(224,185,106,0.5)]';
}

export function LeaderboardTabs({
  globalsByLevel,
  sprint,
  configured,
}: LeaderboardTabsProps) {
  const [active, setActive] = useState<TabKey>('global');
  const [activeWorld, setActiveWorld] = useState<WorldId>('world1');
  const [activeBiome, setActiveBiome] = useState<BiomeId>('seed-grove');
  const [activeLevel, setActiveLevel] = useState<CampaignLevelId>(
    'world1-level-1',
  );

  const activeWorldMeta = useMemo(
    () => WORLDS.find((w) => w.id === activeWorld) ?? WORLDS[0],
    [activeWorld],
  );

  // Resolve the active biome's pill subset + its display label so the
  // levels visually condense to 10 at a time without losing the
  // "scan everything" affordance — clicking the biome row is a single hop.
  const activeBiomeMeta = useMemo(
    () => ALL_BIOMES.find((b) => b.id === activeBiome) ?? ALL_BIOMES[0],
    [activeBiome],
  );
  const visibleLevelPills = useMemo(
    () =>
      LEVEL_PILLS.filter(
        (p) => p.index >= activeBiomeMeta.from && p.index <= activeBiomeMeta.to,
      ),
    [activeBiomeMeta],
  );

  // Switching world hops to its first act + first level.
  const handleWorldChange = (next: WorldId) => {
    const w = WORLDS.find((x) => x.id === next);
    if (!w) return;
    setActiveWorld(next);
    const firstBiome = w.biomes[0];
    setActiveBiome(firstBiome.id);
    const firstLevel = LEVEL_PILLS.find((p) => p.index === firstBiome.from);
    if (firstLevel) setActiveLevel(firstLevel.id);
  };

  // Keep activeLevel inside the active biome's range. If the user
  // switches biome while pointing at an out-of-range level, snap to
  // the first level of the new biome.
  const handleBiomeChange = (next: BiomeId) => {
    const meta = ALL_BIOMES.find((b) => b.id === next);
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
          {/* World row — top tier of the Saga Atlas: Logic Garden / Astral
              Nexus. Mirrors the in-app World selector; switching world hops to
              its first act + level. The active world carries its own accent. */}
          {WORLDS.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {WORLDS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleWorldChange(w.id)}
                  className={cn(
                    'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all duration-[var(--motion-fast)]',
                    activeWorld === w.id
                      ? worldActiveClass(w.accent)
                      : 'text-[var(--color-text-muted)] ring-1 ring-[var(--color-glass-border)] hover:text-[var(--color-text)]',
                  )}
                  aria-pressed={activeWorld === w.id}
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}
          {/* Biome row — the active world's three acts. Switching biome snaps
              the level pills below to that biome's range. */}
          <div className="mb-3 flex flex-wrap gap-2">
            {activeWorldMeta.biomes.map((b) => (
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
            {activeWorldMeta.label} · {activeBiomeMeta.label} · Level{' '}
            {activeLevel.replace(/^world[12]-level-/, '')}
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
