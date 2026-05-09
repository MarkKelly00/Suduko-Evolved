import { GlassCard } from '@/components/ui/GlassCard';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { AppPreviewFrame } from './AppPreviewFrame';
import { LOGIC_GARDEN } from '@/lib/brand/copy';

export function SagaMapShowcase() {
  return (
    <section className="relative px-6 py-14 md:py-24 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 30%, rgba(0,229,204,0.07), transparent 70%)',
        }}
      />
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        {/* Phone first on mobile, second on desktop */}
        <div className="order-2 lg:order-1">
          <AppPreviewFrame variant="garden" />
        </div>

        <div className="order-1 lg:order-2">
          <SectionEyebrow>{LOGIC_GARDEN.name}</SectionEyebrow>
          <h2 className="mt-4 serif-display text-4xl md:text-5xl text-glow-gold">
            {LOGIC_GARDEN.worldTagline}
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--color-text-muted)]">
            World 1 unfolds across three acts. Each landmark you clear opens
            the next path. Stars and crowns mark the way.
          </p>

          {/* Acts */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {LOGIC_GARDEN.acts.map((act, i) => (
              <GlassCard key={act} padding="sm">
                <p className="text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-text-dim)]">
                  Act {i + 1}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-text)]">
                  {act}
                </p>
              </GlassCard>
            ))}
          </div>

          {/* Landmarks */}
          <ul className="mt-8 space-y-2.5">
            {LOGIC_GARDEN.landmarks.map((landmark, i) => (
              <li key={landmark} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[0.6rem] font-bold tabular-nums"
                  style={{
                    background:
                      i < 3
                        ? 'rgba(94,231,196,0.15)'
                        : i === 3
                          ? 'rgba(224,185,106,0.18)'
                          : 'rgba(31,42,68,0.6)',
                    color:
                      i < 3
                        ? '#86F0C5'
                        : i === 3
                          ? '#F5D58A'
                          : '#5A6582',
                    border: `1px solid ${i < 3 ? 'rgba(94,231,196,0.35)' : i === 3 ? 'rgba(224,185,106,0.4)' : 'rgba(74,88,120,0.4)'}`,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  className={
                    i <= 3
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-dim)]'
                  }
                >
                  {landmark}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
