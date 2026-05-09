import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import {
  buildAppStoreUrl,
  buildPlayStoreUrl,
  buildTestFlightUrl,
} from '@/lib/deep-links/urls';
import { TAGLINE } from '@/lib/brand/copy';

export const metadata: Metadata = {
  title: 'Download',
  description: 'Get Sudoku Evolved on iOS — App Store and TestFlight.',
};

export default function DownloadPage() {
  const appStore = buildAppStoreUrl();
  const testflight = buildTestFlightUrl();
  const playStore = buildPlayStoreUrl();

  return (
    <>
      <SiteHeader />
      <main className="relative px-6 py-16 md:py-24">
        <LogicGardenBackdrop />
        <div className="relative mx-auto max-w-3xl">
          <SectionEyebrow align="center">Download</SectionEyebrow>
          <h1 className="mt-4 text-center serif-display text-4xl md:text-5xl text-glow-gold">
            Get Sudoku Evolved.
          </h1>
          <p className="mt-4 mx-auto max-w-md text-center text-base leading-relaxed text-[var(--color-text-muted)]">
            {TAGLINE} Built for iPhone, with iPad and Android coming soon.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
            <GlassCard padding="lg" className="!rounded-3xl text-center">
              <p className="section-eyebrow">iOS · App Store</p>
              <h2 className="mt-3 serif-display text-2xl text-[var(--color-text)]">
                For everyone
              </h2>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                The official, stable release. Recommended for most players.
              </p>
              <div className="mt-6 flex justify-center">
                <PremiumButton size="md" variant="primary" href={appStore}>
                  Download for iOS
                  <ArrowRight className="h-4 w-4" />
                </PremiumButton>
              </div>
            </GlassCard>

            <GlassCard padding="lg" className="!rounded-3xl text-center">
              <p className="section-eyebrow">TestFlight</p>
              <h2 className="mt-3 serif-display text-2xl text-[var(--color-text)]">
                For early access
              </h2>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                Try the next build before it ships. Bug-friendly, feature-fresh.
              </p>
              <div className="mt-6 flex justify-center">
                <PremiumButton size="md" variant="secondary" href={testflight}>
                  Join TestFlight
                </PremiumButton>
              </div>
            </GlassCard>
          </div>

          <div className="mt-10 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-dim)]">
              Android
            </p>
            <div className="mt-3 flex justify-center">
              {playStore ? (
                <PremiumButton size="md" variant="ghost" href={playStore}>
                  Get on Google Play
                </PremiumButton>
              ) : (
                <PremiumButton size="md" variant="ghost">
                  Android · Coming soon
                </PremiumButton>
              )}
            </div>
          </div>

          <p className="mt-12 text-center text-xs uppercase tracking-[0.2em] text-[var(--color-text-dim)]">
            iOS 15.1+ · iPhone
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
