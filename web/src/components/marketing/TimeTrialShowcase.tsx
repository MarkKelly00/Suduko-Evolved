import { Clock, Link as LinkIcon, Swords, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { AppPreviewFrame } from './AppPreviewFrame';
import { TIME_TRIALS } from '@/lib/brand/copy';

const ICONS = [Clock, Swords, Users, LinkIcon] as const;

export function TimeTrialShowcase() {
  return (
    <section className="relative px-6 py-14 md:py-24 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 70% 30%, rgba(224,185,106,0.06), transparent 70%)',
        }}
      />
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <SectionEyebrow>Time Trials · Online Duels</SectionEyebrow>
          <h2 className="mt-4 serif-display text-4xl md:text-5xl text-[var(--color-text)]">
            {TIME_TRIALS.sectionTitle}
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--color-text-muted)]">
            Find a rival solving the same grid in real time. Watch their
            progress on the same seed. Cleanest solve takes the crown.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TIME_TRIALS.modes.map((m, i) => {
              const Icon = ICONS[i];
              return (
                <GlassCard key={m.title} padding="md">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(94,231,196,0.12)] text-[var(--color-garden-cyan-glow)] ring-1 ring-[rgba(94,231,196,0.3)]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-text)]">
                    {m.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {m.body}
                  </p>
                </GlassCard>
              );
            })}
          </div>
        </div>

        <div>
          <AppPreviewFrame variant="time-trial" />
        </div>
      </div>
    </section>
  );
}
