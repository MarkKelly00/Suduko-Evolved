import Image from 'next/image';
import Link from 'next/link';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PRODUCT_NAME } from '@/lib/brand/copy';
import { getBestIosCtaUrl } from '@/lib/deep-links/urls';

export function SiteHeader() {
  const iosUrl = getBestIosCtaUrl();
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md">
      <div className="border-b border-[var(--color-divider)]/60 bg-[var(--color-bg)]/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="group flex items-center gap-2">
            <Image
              aria-hidden
              src="/app-icon.png"
              alt=""
              width={28}
              height={28}
              priority
              className="h-7 w-7 rounded-md shadow-[0_0_18px_-4px_rgba(245,213,138,0.45)] transition-shadow group-hover:shadow-[0_0_22px_-3px_rgba(245,213,138,0.7)]"
            />
            <span className="font-[family-name:var(--font-display)] text-sm font-bold tracking-wide text-[var(--color-text)] transition-colors group-hover:text-[var(--color-gold-glow)]">
              {PRODUCT_NAME}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.15em] text-[var(--color-text-muted)] sm:flex">
            <Link href="/#features" className="hover:text-[var(--color-text)]">
              Features
            </Link>
            <Link href="/leaderboards" className="hover:text-[var(--color-text)]">
              Leaderboards
            </Link>
            <Link href="/support" className="hover:text-[var(--color-text)]">
              Support
            </Link>
          </nav>

          <PremiumButton size="sm" variant="primary" href={iosUrl}>
            Download
          </PremiumButton>
        </div>
      </div>
    </header>
  );
}
