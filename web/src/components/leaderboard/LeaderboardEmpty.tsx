import { Trophy } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { getBestIosCtaUrl } from '@/lib/deep-links/urls';

interface LeaderboardEmptyProps {
  title?: string;
  body?: string;
}

export function LeaderboardEmpty({
  title = 'Leaderboards open in the app.',
  body = 'Sign in inside Sudoku Evolved to climb the global, friend, time-trial, and duel boards.',
}: LeaderboardEmptyProps) {
  const iosUrl = getBestIosCtaUrl();
  return (
    <GlassCard padding="lg" className="!rounded-3xl text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(224,185,106,0.12)] text-[var(--color-gold-glow)] ring-1 ring-[rgba(224,185,106,0.25)]">
        <Trophy className="h-5 w-5" />
      </div>
      <h2 className="mt-5 serif-display text-2xl text-[var(--color-text)]">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
        {body}
      </p>
      <div className="mt-6 flex justify-center">
        <PremiumButton size="md" variant="primary" href={iosUrl}>
          Download for iOS
        </PremiumButton>
      </div>
    </GlassCard>
  );
}
