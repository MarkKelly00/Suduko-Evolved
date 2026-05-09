import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { getBestIosCtaUrl } from '@/lib/deep-links/urls';

interface InviteExpiredStateProps {
  variant: 'expired' | 'consumed' | 'invalid';
}

const COPY = {
  expired: {
    eyebrow: 'Logic Duel · Expired',
    title: 'This duel has timed out.',
    body: 'Duel invites only stay open for a short window. Ask your friend to send a fresh challenge from inside the app.',
  },
  consumed: {
    eyebrow: 'Logic Duel · Already accepted',
    title: 'This duel has already started.',
    body: 'Someone already accepted this invite. Open Sudoku Evolved to start a new one.',
  },
  invalid: {
    eyebrow: 'Logic Duel · Invalid',
    title: "We couldn't find that duel.",
    body: 'The invite code may have been mistyped or the link is no longer active.',
  },
} as const;

export function InviteExpiredState({ variant }: InviteExpiredStateProps) {
  const c = COPY[variant];
  const iosUrl = getBestIosCtaUrl();
  return (
    <GlassCard padding="lg" className="!rounded-3xl text-center">
      <SectionEyebrow align="center">{c.eyebrow}</SectionEyebrow>
      <h1 className="mt-4 serif-display text-3xl md:text-4xl text-[var(--color-text)]">
        {c.title}
      </h1>
      <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[var(--color-text-muted)]">
        {c.body}
      </p>
      <div className="mt-8 flex justify-center">
        <PremiumButton size="md" variant="primary" href={iosUrl}>
          Download for iOS
        </PremiumButton>
      </div>
    </GlassCard>
  );
}
