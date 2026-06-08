import { ArrowRight } from 'lucide-react';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { AppPreviewFrame } from './AppPreviewFrame';
import { LogicGardenBackdrop } from './LogicGardenBackdrop';
import { HERO_BODY, TAGLINE } from '@/lib/brand/copy';
import { getBestIosCtaUrl } from '@/lib/deep-links/urls';

export function HeroSection() {
  const iosUrl = getBestIosCtaUrl();

  return (
    <section className="relative overflow-hidden pb-14 pt-10 md:pb-24 md:pt-20 lg:pb-36 lg:pt-28">
      <LogicGardenBackdrop />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-6 md:grid-cols-[1.15fr_1fr] md:gap-16">
        {/* Copy */}
        <div className="text-center md:text-left">
          <div className="mb-6 flex justify-center md:justify-start">
            <SectionEyebrow align="center">Sudoku</SectionEyebrow>
          </div>

          <h1
            className="serif-display text-[3.4rem] sm:text-[4.5rem] md:text-[5.5rem] lg:text-[6rem] text-glow-gold"
          >
            Evolved
          </h1>

          <p className="mt-6 font-[family-name:var(--font-display)] text-xl italic text-[var(--color-text)] md:text-2xl">
            {TAGLINE}
          </p>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)] md:mx-0 md:text-lg">
            {HERO_BODY}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <PremiumButton size="lg" variant="primary" href={iosUrl}>
              Download for iOS
              <ArrowRight className="h-4 w-4" />
            </PremiumButton>
            <PremiumButton size="lg" variant="ghost" href="#features">
              View features
            </PremiumButton>
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-[var(--color-text-dim)]">
            iOS · iPhone · iOS 15.1+
          </p>
        </div>

        {/* Phone preview */}
        <div className="relative mx-auto md:mx-0">
          <AppPreviewFrame variant="garden" />
        </div>
      </div>
    </section>
  );
}
