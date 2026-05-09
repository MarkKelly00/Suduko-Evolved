import { GlassCard } from '@/components/ui/GlassCard';
import type { PublicProfile } from '@/lib/supabase/types';

interface Props {
  profile: PublicProfile;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatTimeMs(ms: number | null): string {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PublicStatsGrid({ profile }: Props) {
  const stats: { label: string; value: string; color?: string }[] = [
    { label: 'XP', value: formatNumber(profile.xp), color: '#F5D58A' },
    { label: 'Levels cleared', value: formatNumber(profile.levels_cleared) },
    { label: 'Stars earned', value: formatNumber(profile.stars_total) },
    { label: 'Crowns', value: formatNumber(profile.crowns_total), color: '#F5D58A' },
    {
      label: 'Best Sprint',
      value: formatTimeMs(profile.best_time_trial_score),
    },
    {
      label: 'Joined',
      value: new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
    },
  ];

  return (
    <GlassCard padding="lg" className="!rounded-3xl">
      <p className="section-eyebrow">Stats</p>
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label}>
            <p
              className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums"
              style={{ color: s.color ?? 'var(--color-text)' }}
            >
              {s.value}
            </p>
            <p className="mt-1 text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
