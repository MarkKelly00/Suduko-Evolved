import { cn } from '@/lib/utils';

interface CrownBadgeProps {
  count?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export function CrownBadge({ count, className, size = 'md' }: CrownBadgeProps) {
  const sizeCls = size === 'sm' ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-sm';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        'bg-[rgba(224,185,106,0.12)] text-[var(--color-gold-glow)]',
        'border border-[rgba(224,185,106,0.25)]',
        sizeCls,
        className,
      )}
      aria-label={count !== undefined ? `${count} crowns` : 'Crown'}
    >
      <span className="leading-none drop-shadow-[0_0_6px_rgba(245,213,138,0.6)]" aria-hidden>
        ♛
      </span>
      {count !== undefined && <span className="tabular-nums">{count}</span>}
    </span>
  );
}
