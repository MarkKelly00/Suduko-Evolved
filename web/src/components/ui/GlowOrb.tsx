import { cn } from '@/lib/utils';

interface GlowOrbProps {
  color?: 'gold' | 'teal' | 'blue' | 'purple';
  size?: number;
  className?: string;
  /** Opacity 0..1. Defaults vary per color. */
  intensity?: number;
}

const colorMap = {
  gold: 'rgba(224, 185, 106, var(--orb-a))',
  teal: 'rgba(94, 231, 196, var(--orb-a))',
  blue: 'rgba(123, 167, 242, var(--orb-a))',
  purple: 'rgba(157, 123, 255, var(--orb-a))',
} as const;

export function GlowOrb({
  color = 'gold',
  size = 480,
  className,
  intensity = 0.32,
}: GlowOrbProps) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute rounded-full blur-3xl', className)}
      style={
        {
          width: size,
          height: size,
          background: `radial-gradient(circle, ${colorMap[color]} 0%, transparent 70%)`,
          ['--orb-a' as string]: intensity,
        } as React.CSSProperties
      }
    />
  );
}
