import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { CrownBadge } from '@/components/ui/CrownBadge';
import { FRIENDS_LEADERBOARD } from '@/lib/brand/copy';

const SAMPLE_ROWS = [
  { rank: 1, name: 'Iris', xp: '24,820', tag: 'crown', time: '2:14' },
  { rank: 2, name: 'Mara', xp: '23,410', tag: null, time: '2:31' },
  { rank: 3, name: 'Kojo', xp: '22,995', tag: null, time: '2:45' },
  { rank: 4, name: 'You', xp: '22,710', tag: 'you', time: '2:48' },
] as const;

export function FriendsLeaderboardShowcase() {
  return (
    <section className="relative px-6 py-14 md:py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        {/* Mocked leaderboard panel */}
        <GlassCard padding="md" glow="gold" className="!rounded-3xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(224,185,106,0.12)] text-[var(--color-gold-glow)] ring-1 ring-[rgba(224,185,106,0.25)]">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Sprint 3:00 · Friends
                </p>
                <p className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-text)]">
                  This week
                </p>
              </div>
            </div>
            <Link
              href="/leaderboards"
              className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-gold-glow)] hover:text-[var(--color-gold)]"
            >
              View all
            </Link>
          </div>

          <div className="space-y-2">
            {SAMPLE_ROWS.map((r) => (
              <div
                key={r.rank}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-surface)] px-3 py-2.5"
                style={
                  r.tag === 'you'
                    ? {
                        borderColor: 'rgba(224,185,106,0.4)',
                        background:
                          'linear-gradient(180deg, rgba(224,185,106,0.06), rgba(224,185,106,0.02))',
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums"
                    style={{
                      background:
                        r.rank === 1
                          ? 'rgba(224,185,106,0.18)'
                          : r.rank === 2
                            ? 'rgba(140,150,180,0.12)'
                            : r.rank === 3
                              ? 'rgba(180,120,80,0.12)'
                              : 'rgba(31,42,68,0.6)',
                      color:
                        r.rank === 1 ? '#F5D58A' : '#ECEFF7',
                    }}
                  >
                    {r.rank}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{r.name}</p>
                    <p className="text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
                      Best {r.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.tag === 'crown' && <CrownBadge size="sm" />}
                  <span className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-[var(--color-text)]">
                    {r.xp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div>
          <SectionEyebrow>Friends · Leaderboards</SectionEyebrow>
          <h2 className="mt-4 serif-display text-4xl md:text-5xl text-[var(--color-text)]">
            {FRIENDS_LEADERBOARD.title}
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--color-text-muted)]">
            {FRIENDS_LEADERBOARD.body}
          </p>

          <Link
            href="/leaderboards"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--color-gold-glow)] transition-colors hover:text-[var(--color-gold)]"
          >
            Explore leaderboards
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
