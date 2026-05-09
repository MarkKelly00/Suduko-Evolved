import { GlassCard } from '@/components/ui/GlassCard';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="relative px-6 py-12 md:py-16">
        <LogicGardenBackdrop />
        <div className="relative mx-auto max-w-3xl space-y-6">
          <GlassCard padding="lg" className="!rounded-3xl">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 flex-shrink-0 animate-pulse rounded-full bg-[var(--color-divider)]" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
                <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-divider)]" />
              </div>
            </div>
          </GlassCard>
          <GlassCard padding="lg" className="!rounded-3xl">
            <div className="grid grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i}>
                  <div className="h-7 w-16 animate-pulse rounded bg-[var(--color-divider)]" />
                  <div className="mt-2 h-3 w-20 animate-pulse rounded bg-[var(--color-divider)]" />
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
