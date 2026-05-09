'use client';

import { useState } from 'react';
import { LeaderboardRow } from './LeaderboardRow';
import { LeaderboardEmpty } from './LeaderboardEmpty';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import type { LeaderboardRow as Row } from '@/lib/supabase/types';

type TabKey = 'global' | 'sprint' | 'duels' | 'friends';

interface LeaderboardTabsProps {
  global: Row[];
  sprint: Row[];
  configured: boolean;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'sprint', label: '3-Min Sprint' },
  { key: 'duels', label: 'Duels' },
  { key: 'friends', label: 'Friends' },
];

export function LeaderboardTabs({ global, sprint, configured }: LeaderboardTabsProps) {
  const [active, setActive] = useState<TabKey>('global');

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
          <p className="section-eyebrow mb-4">Global · Logic Garden, Level 1</p>
          {renderRows(global, { showStars: true })}
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
