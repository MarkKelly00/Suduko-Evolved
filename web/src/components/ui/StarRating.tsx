import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number; // 0..3
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'text-base', md: 'text-xl', lg: 'text-3xl' } as const;

export function StarRating({ value, max = 3, size = 'md', className }: StarRatingProps) {
  return (
    <div className={cn('inline-flex items-center gap-1.5', sizeMap[size], className)}
         aria-label={`${value} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            'leading-none',
            i < value
              ? 'text-[var(--color-gold-glow)] drop-shadow-[0_0_8px_rgba(245,213,138,0.55)]'
              : 'text-[var(--color-text-dim)]/60',
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
}
