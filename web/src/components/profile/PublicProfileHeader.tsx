import { GlassCard } from '@/components/ui/GlassCard';
import { CrownBadge } from '@/components/ui/CrownBadge';
import type { PublicProfile } from '@/lib/supabase/types';

interface Props {
  profile: PublicProfile;
}

function initials(name: string | null | undefined): string {
  if (!name) return '★';
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function PublicProfileHeader({ profile }: Props) {
  const displayName = profile.display_name || profile.username || 'Anonymous solver';
  return (
    <GlassCard padding="lg" glow="gold" className="!rounded-3xl">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        {/* Avatar */}
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-[rgba(224,185,106,0.4)] shadow-[0_0_30px_-6px_rgba(224,185,106,0.45)]">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={`${displayName}'s avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1A2440] to-[#0F1727] font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-gold-glow)]">
              {initials(displayName)}
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h1 className="serif-display text-3xl md:text-4xl text-[var(--color-text)]">
            {displayName}
          </h1>
          {profile.username && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              @{profile.username}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <CrownBadge count={profile.crowns_total} size="sm" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass-fill)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
              <span aria-hidden className="text-[var(--color-success)]">🔥</span>
              <span className="font-semibold tabular-nums text-[var(--color-text)]">
                {profile.streak}
              </span>
              <span>day streak</span>
            </span>
            {profile.privacy_level === 'friends' && (
              <span className="rounded-full border border-[var(--color-divider)] px-3 py-1 text-xs text-[var(--color-text-dim)]">
                Friends-only profile
              </span>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
