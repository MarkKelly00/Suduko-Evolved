import { type ReactNode } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { LAST_UPDATED } from '@/lib/brand/copy';

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
  /** Override the global LAST_UPDATED constant for a specific page. */
  lastUpdated?: string;
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
  lastUpdated = LAST_UPDATED,
}: LegalPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="relative px-6 py-12 md:py-20">
        <LogicGardenBackdrop />
        <div className="relative mx-auto max-w-3xl">
          <SectionEyebrow>{eyebrow}</SectionEyebrow>
          <h1 className="mt-4 serif-display text-4xl md:text-5xl text-[var(--color-text)]">
            {title}
          </h1>
          {intro && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-text-muted)]">
              {intro}
            </p>
          )}
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--color-text-dim)]">
            Last updated {lastUpdated}
          </p>

          <GlassCard padding="lg" className="!rounded-3xl mt-8">
            <div className="legal-prose space-y-6 text-[var(--color-text)]">
              {children}
            </div>
          </GlassCard>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
