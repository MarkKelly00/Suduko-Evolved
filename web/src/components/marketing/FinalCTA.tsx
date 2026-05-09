import { ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { GlowOrb } from '@/components/ui/GlowOrb';
import { FINAL_CTA } from '@/lib/brand/copy';
import { buildAppStoreUrl, buildTestFlightUrl } from '@/lib/deep-links/urls';

export function FinalCTA() {
  const appStore = buildAppStoreUrl();
  const testflight = buildTestFlightUrl();
  return (
    <section className="relative overflow-hidden px-6 py-14 md:py-24 lg:py-32">
      <GlowOrb color="gold" size={720} intensity={0.18} className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative mx-auto max-w-4xl">
        <GlassCard glow="gold" padding="lg" className="!rounded-3xl text-center">
          <h2 className="serif-display text-4xl md:text-5xl text-glow-gold">
            {FINAL_CTA.title}
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[var(--color-text-muted)]">
            {FINAL_CTA.body}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <PremiumButton size="lg" variant="primary" href={appStore}>
              Download for iOS
              <ArrowRight className="h-4 w-4" />
            </PremiumButton>
            <PremiumButton size="lg" variant="secondary" href={testflight}>
              Join TestFlight
            </PremiumButton>
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-[var(--color-text-dim)]">
            Built for iPhone · iOS 15.1+
          </p>
        </GlassCard>
      </div>
    </section>
  );
}
