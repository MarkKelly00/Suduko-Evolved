import { Crown, Map, Sparkles, Swords } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { FEATURES } from '@/lib/brand/copy';

const ICONS = [Crown, Sparkles, Map, Swords] as const;

export function FeatureGrid() {
  return (
    <section id="features" className="relative px-6 py-14 md:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center md:mb-12">
          <SectionEyebrow align="center">What it is</SectionEyebrow>
          <h2 className="mt-4 serif-display text-3xl md:text-5xl text-[var(--color-text)]">
            A premium puzzle, refined.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = ICONS[i];
            return (
              <GlassCard key={f.title} padding="md" glow={i === 1 ? 'gold' : 'none'}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(224,185,106,0.12)] text-[var(--color-gold-glow)] ring-1 ring-[rgba(224,185,106,0.25)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-5 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-text)]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {f.body}
                </p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
