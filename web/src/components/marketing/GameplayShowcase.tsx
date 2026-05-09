import { GlassCard } from '@/components/ui/GlassCard';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { StarRating } from '@/components/ui/StarRating';
import { CrownBadge } from '@/components/ui/CrownBadge';
import { AppPreviewFrame } from './AppPreviewFrame';
import { ACHIEVEMENTS } from '@/lib/brand/copy';

export function GameplayShowcase() {
  return (
    <section className="relative px-6 py-14 md:py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <SectionEyebrow>Cinematic VFX</SectionEyebrow>
          <h2 className="mt-4 serif-display text-4xl md:text-5xl text-[var(--color-text)]">
            Every clean placement{' '}
            <span className="text-glow-teal italic">earns</span> something.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--color-text-muted)]">
            Row sweeps, box bursts, and a Perfect Bloom finish — the puzzle
            applauds the solve. Honest Sudoku, with feedback worthy of it.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            <AchievementChip name={ACHIEVEMENTS.logicBloom} subtitle="Full puzzle clear" />
            <AchievementChip name={ACHIEVEMENTS.perfectBloom} subtitle="No mistakes" />
            <AchievementChip name={ACHIEVEMENTS.perfectHarmony} subtitle="4+ combos" />
            <AchievementChip name={ACHIEVEMENTS.logicCascade} subtitle="3 combos" />
          </div>

          <div className="mt-10 flex items-center gap-4">
            <StarRating value={3} size="lg" />
            <CrownBadge count={1} />
            <span className="text-sm text-[var(--color-text-muted)]">on every clean solve</span>
          </div>
        </div>

        <div>
          <AppPreviewFrame variant="sudoku" />
        </div>
      </div>
    </section>
  );
}

function AchievementChip({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <GlassCard padding="sm" className="!rounded-xl">
      <p className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-gold-glow)]">
        {name}
      </p>
      <p className="mt-1 text-[0.7rem] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
        {subtitle}
      </p>
    </GlassCard>
  );
}
