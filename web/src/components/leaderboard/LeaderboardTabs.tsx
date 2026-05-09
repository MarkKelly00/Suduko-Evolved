'use client';

import { useState } from 'react';
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
  /** L1–L5 leaderboards keyed by campaign level id. */
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

/** Pill labels for the L1–L5 sub-selector — matches the iOS Leaderboard
 *  screen which renders these as `id.replace('world1-level-', 'L')`. */
const LEVEL_PILLS = CAMPAIGN_LEVEL_IDS.map((id) => ({
  id,
  label: id.replace('world1-level-', 'L'),
}));

export function LeaderboardTabs({
  globalsByLevel,
  sprint,
  configured,
}: LeaderboardTabsProps) {
  const [active, setActive] = useState<TabKey>('global');
  const [activeLevel, setActiveLevel] = useState<CampaignLevelId>(
    'world1-level-1',
  );

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
          {/* L1–L5 sub-selector — mirrors the iOS Leaderboard screen.
              All five leaderboards were fetched server-side, so switching
              between levels is instant with no extra round-trips. */}
          <div className="mb-4 flex flex-wrap gap-2">
            {LEVEL_PILLS.map((lvl) => (
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
            Global · Logic Garden, Level{' '}
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
