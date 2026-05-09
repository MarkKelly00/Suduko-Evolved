import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'gold' | 'teal' | 'none';
  padding?: 'sm' | 'md' | 'lg';
}

const glowMap = {
  gold: 'shadow-[0_0_60px_-20px_rgba(224,185,106,0.35)]',
  teal: 'shadow-[0_0_60px_-20px_rgba(94,231,196,0.35)]',
  none: '',
} as const;

const paddingMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8 md:p-10',
} as const;

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow = 'none', padding = 'md', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'glass-card relative overflow-hidden transition-transform duration-[var(--motion-base)]',
        paddingMap[padding],
        glowMap[glow],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
GlassCard.displayName = 'GlassCard';
