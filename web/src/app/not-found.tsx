import Link from 'next/link';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="relative flex min-h-[80vh] items-center justify-center px-6 py-20">
        <LogicGardenBackdrop />
        <GlassCard padding="lg" className="!rounded-3xl text-center max-w-lg">
          <p className="section-eyebrow">404</p>
          <h1 className="mt-3 serif-display text-4xl text-glow-gold">Path not found.</h1>
          <p className="mt-5 text-base text-[var(--color-text-muted)]">
            The grid here is incomplete. Wander back to the homepage and try
            another move.
          </p>
          <div className="mt-8 flex justify-center">
            <PremiumButton size="md" variant="primary" href="/">
              Return home
            </PremiumButton>
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
            <Link href="/leaderboards" className="hover:text-[var(--color-text)]">
              Or visit the leaderboards →
            </Link>
          </p>
        </GlassCard>
      </main>
      <SiteFooter />
    </>
  );
}
