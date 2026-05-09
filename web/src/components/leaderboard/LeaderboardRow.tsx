import { CrownBadge } from '@/components/ui/CrownBadge';
import { StarRating } from '@/components/ui/StarRating';
import type { LeaderboardRow as Row } from '@/lib/supabase/types';

interface Props {
  row: Row;
  showStars?: boolean;
  showTime?: boolean;
}

function formatTimeMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LeaderboardRow({ row, showStars = false, showTime = true }: Props) {
  const name =
    row.display_name || (row.username ? `@${row.username}` : 'Anonymous');
  const isPodium = row.rank <= 3;
  const podiumColor =
    row.rank === 1
      ? 'rgba(224,185,106,0.18)'
      : row.rank === 2
        ? 'rgba(140,150,180,0.12)'
        : 'rgba(180,120,80,0.12)';
  const podiumText = row.rank === 1 ? '#F5D58A' : '#ECEFF7';

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-surface)] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
          style={{
            background: isPodium ? podiumColor : 'rgba(31,42,68,0.6)',
            color: isPodium ? podiumText : '#ECEFF7',
            border: `1px solid ${isPodium ? 'rgba(224,185,106,0.3)' : 'rgba(74,88,120,0.4)'}`,
          }}
        >
          {row.rank}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text)]">
            {name}
          </p>
          {row.username && row.display_name && (
            <p className="truncate text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
              @{row.username}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        {showStars && row.stars !== undefined && (
          <StarRating value={row.stars} size="sm" />
        )}
        {row.crown && <CrownBadge size="sm" />}
        {showTime && (
          <span className="hidden text-xs tabular-nums text-[var(--color-text-muted)] sm:inline">
            {formatTimeMs(row.time_ms)}
          </span>
        )}
        <span className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-[var(--color-text)]">
          {row.score.toLocaleString('en-US')}
        </span>
      </div>
    </div>
  );
}
