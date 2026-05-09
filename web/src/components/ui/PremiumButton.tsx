import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  /** When undefined, renders disabled with "Coming soon" hint. */
  href?: string;
  external?: boolean;
  comingSoonLabel?: string;
}

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type AnchorProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

type Props = ButtonProps | AnchorProps;

const variantMap: Record<Variant, string> = {
  primary:
    'gold-cta font-semibold uppercase tracking-[0.12em] hover:scale-[1.02] active:scale-[0.99]',
  secondary:
    'glass-card font-semibold uppercase tracking-[0.12em] text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.08)] hover:scale-[1.02] active:scale-[0.99]',
  ghost:
    'font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
};

const sizeMap: Record<Size, string> = {
  sm: 'h-9 px-4 text-xs rounded-full',
  md: 'h-11 px-6 text-sm rounded-full',
  lg: 'h-14 px-8 text-base rounded-full',
};

const baseClass =
  'inline-flex items-center justify-center gap-2 transition-all duration-[var(--motion-base)] [transition-timing-function:var(--ease-premium)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 select-none whitespace-nowrap';

function isAnchor(p: Props): p is AnchorProps {
  return 'href' in p && typeof p.href === 'string' && p.href.length > 0;
}

export const PremiumButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  function PremiumButton(props, ref) {
    const {
      variant = 'primary',
      size = 'md',
      className,
      children,
      comingSoonLabel = 'Coming soon',
    } = props;

    const cls = cn(baseClass, variantMap[variant], sizeMap[size], className);

    if (isAnchor(props)) {
      const { href, external, ...rest } = props;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { variant: _v, size: _s, comingSoonLabel: _c, ...anchorRest } = rest;
      const isExternal = external ?? /^https?:\/\//.test(href);
      if (isExternal) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            className={cls}
            target="_blank"
            rel="noopener noreferrer"
            {...anchorRest}
          >
            {children}
          </a>
        );
      }
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href as never}
          className={cls}
          {...anchorRest}
        >
          {children}
        </Link>
      );
    }

    // Disabled "Coming soon" state — preserves layout, never links to a fake URL.
    const { ...buttonRest } = props as ButtonProps;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { variant: _v, size: _s, comingSoonLabel: _c, href: _h, external: _e, ...btnAttrs } =
      buttonRest;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        className={cls}
        disabled
        title={comingSoonLabel}
        aria-disabled="true"
        {...btnAttrs}
      >
        {children}
        <span className="sr-only"> — {comingSoonLabel}</span>
      </button>
    );
  },
);
