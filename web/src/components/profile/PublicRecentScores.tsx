import { GlassCard } from '@/components/ui/GlassCard';
import { StarRating } from '@/components/ui/StarRating';
import { CrownBadge } from '@/components/ui/CrownBadge';
import type { PublicLevelScore } from '@/lib/supabase/types';

interface Props {
  scores: PublicLevelScore[];
}

function formatTimeMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PublicRecentScores({ scores }: Props) {
  if (scores.length === 0) {
    return (
      <GlassCard padding="lg" className="!rounded-3xl">
        <p className="section-eyebrow">Recent solves</p>
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          No public solves to show yet.
        </p>
      </GlassCard>
    );
  }
  return (
    <GlassCard padding="lg" className="!rounded-3xl">
      <p className="section-eyebrow">Recent solves</p>
      <ul className="mt-5 divide-y divide-[var(--color-divider)]">
        {scores.map((s) => (
          <li
            key={`${s.level_id}-${s.completed_at}`}
            className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                {s.level_id}
              </p>
              <p className="text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
                {new Date(s.completed_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                · {formatTimeMs(s.time_ms)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StarRating value={s.stars} size="sm" />
              {s.crown && <CrownBadge size="sm" />}
              <span className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-[var(--color-text)]">
                {s.score.toLocaleString('en-US')}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
