import Link from 'next/link';
import { PRODUCT_NAME, TAGLINE } from '@/lib/brand/copy';

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-divider)] bg-[var(--color-bg-bottom)]/50 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-text)]">
            {PRODUCT_NAME}
          </p>
          <p className="mt-1 text-xs italic text-[var(--color-text-muted)]">
            {TAGLINE}
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
          <Link href="/leaderboards" className="hover:text-[var(--color-text)]">
            Leaderboards
          </Link>
          <Link href="/support" className="hover:text-[var(--color-text)]">
            Support
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-text)]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-text)]">
            Terms
          </Link>
          <Link href="/delete-account" className="hover:text-[var(--color-text)]">
            Delete account
          </Link>
        </nav>
      </div>

      <p className="mt-8 text-center text-[0.7rem] text-[var(--color-text-dim)]">
        © {new Date().getFullYear()} Mark Kelly Productions LLC. {PRODUCT_NAME}.
      </p>
    </footer>
  );
}
