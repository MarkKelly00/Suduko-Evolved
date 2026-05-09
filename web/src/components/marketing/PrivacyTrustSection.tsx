import { Check } from 'lucide-react';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { PRIVACY_TRUST } from '@/lib/brand/copy';

export function PrivacyTrustSection() {
  return (
    <section className="relative px-6 py-14 md:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <SectionEyebrow align="center">No clutter</SectionEyebrow>
        <h2 className="mt-4 serif-display text-3xl md:text-4xl text-[var(--color-text)]">
          {PRIVACY_TRUST.title}
        </h2>

        <ul className="mx-auto mt-10 max-w-md space-y-3 text-left">
          {PRIVACY_TRUST.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(94,231,196,0.15)] text-[var(--color-success)] ring-1 ring-[rgba(94,231,196,0.3)]">
                <Check className="h-3 w-3" aria-hidden />
              </span>
              <span className="text-[var(--color-text-muted)]">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
