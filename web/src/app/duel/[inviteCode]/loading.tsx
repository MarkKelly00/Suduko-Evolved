import { GlassCard } from '@/components/ui/GlassCard';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="relative px-6 py-16 md:py-24">
        <LogicGardenBackdrop />
        <div className="relative mx-auto max-w-2xl">
          <GlassCard padding="lg" className="!rounded-3xl text-center">
            <div className="mx-auto h-3 w-32 animate-pulse rounded-full bg-[var(--color-divider)]" />
            <div className="mx-auto mt-6 h-10 w-3/4 animate-pulse rounded-full bg-[var(--color-divider)]" />
            <div className="mx-auto mt-4 h-4 w-2/3 animate-pulse rounded-full bg-[var(--color-divider)]" />
            <div className="mx-auto mt-10 h-12 w-48 animate-pulse rounded-full bg-[var(--color-divider)]" />
          </GlassCard>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
