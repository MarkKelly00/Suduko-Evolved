'use client';

import { useEffect, useState } from 'react';
import { Clock, Swords, User } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { OpenInAppButton } from './OpenInAppButton';
import { AppStoreFallbackCard } from './AppStoreFallbackCard';
import type { DuelInvitePreview } from '@/lib/supabase/types';

interface DuelInviteLandingProps {
  inviteCode: string;
  preview: DuelInvitePreview | null;
}

const MODE_LABELS: Record<string, string> = {
  sprint_3min: '3-Minute Sprint',
  duel_5x5: '5×5 Duel',
  duel_9x9: '9×9 Duel',
};

function formatExpiresIn(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)}d`;
  if (hours >= 1) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

export function DuelInviteLanding({ inviteCode, preview }: DuelInviteLandingProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [, force] = useState(0);

  // re-render every 30s so the expiry counter ticks
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const challengerName =
    preview?.challenger_display_name ||
    (preview?.challenger_username ? `@${preview.challenger_username}` : null);
  const modeLabel = preview?.mode ? MODE_LABELS[preview.mode] ?? preview.mode : 'Duel';
  const expiresLabel = preview?.expires_at ? formatExpiresIn(preview.expires_at) : null;

  return (
    <div className="space-y-6">
      <GlassCard padding="lg" glow="gold" className="!rounded-3xl text-center">
        <SectionEyebrow align="center">Logic Duel</SectionEyebrow>
        <h1 className="mt-4 serif-display text-4xl md:text-5xl text-glow-gold">
          You&apos;ve been challenged.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[var(--color-text-muted)]">
          Open Sudoku Evolved to race the same grid in real time.
        </p>

        {/* Challenger / mode / expiry chips */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {challengerName && (
            <Chip icon={<User className="h-3.5 w-3.5" />}>
              From <span className="font-semibold text-[var(--color-text)]">{challengerName}</span>
            </Chip>
          )}
          <Chip icon={<Swords className="h-3.5 w-3.5" />}>
            <span className="font-semibold text-[var(--color-text)]">{modeLabel}</span>
          </Chip>
          {expiresLabel && (
            <Chip icon={<Clock className="h-3.5 w-3.5" />}>
              {expiresLabel === 'expired' ? (
                <span className="text-[var(--color-mistake)]">Expired</span>
              ) : (
                <>
                  Expires in{' '}
                  <span className="font-semibold text-[var(--color-text)]">{expiresLabel}</span>
                </>
              )}
            </Chip>
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <OpenInAppButton
            inviteCode={inviteCode}
            onFallback={() => setShowFallback(true)}
          />
        </div>

        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-[var(--color-text-dim)]">
          Same seed · Real-time progress · Cleanest solve wins
        </p>
      </GlassCard>

      <AppStoreFallbackCard visible={showFallback} />
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass-fill)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] backdrop-blur">
      <span aria-hidden className="text-[var(--color-gold-glow)]">
        {icon}
      </span>
      {children}
    </span>
  );
}
