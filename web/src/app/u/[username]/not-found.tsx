import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export default function ProfileNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="relative px-6 py-16 md:py-24">
        <LogicGardenBackdrop />
        <div className="relative mx-auto max-w-2xl">
          <GlassCard padding="lg" className="!rounded-3xl text-center">
            <SectionEyebrow align="center">Profile</SectionEyebrow>
            <h1 className="mt-4 serif-display text-3xl md:text-4xl text-[var(--color-text)]">
              We couldn&apos;t find that solver.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base text-[var(--color-text-muted)]">
              The username may be private, mistyped, or no longer active.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <PremiumButton size="md" variant="secondary" href="/">
                Return home
              </PremiumButton>
              <PremiumButton size="md" variant="primary" href="/leaderboards">
                See leaderboards
              </PremiumButton>
            </div>
          </GlassCard>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
