'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { getBestIosCtaUrl } from '@/lib/deep-links/urls';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const iosUrl = getBestIosCtaUrl();
  return (
    <main className="relative px-6 py-16 md:py-24">
      <LogicGardenBackdrop />
      <div className="relative mx-auto max-w-2xl">
        <GlassCard padding="lg" className="!rounded-3xl text-center">
          <SectionEyebrow align="center">Logic Duel</SectionEyebrow>
          <h1 className="mt-4 serif-display text-3xl text-[var(--color-text)]">
            Something tripped on the way in.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base text-[var(--color-text-muted)]">
            We couldn&apos;t load this duel preview. Try again, or open the app
            directly.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PremiumButton size="md" variant="secondary" onClick={reset}>
              Try again
            </PremiumButton>
            <PremiumButton size="md" variant="primary" href={iosUrl}>
              Download for iOS
            </PremiumButton>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
