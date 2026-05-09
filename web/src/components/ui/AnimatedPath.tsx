'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedPathProps {
  /** SVG path data. */
  d: string;
  /** Path color — defaults to garden gold core. */
  color?: string;
  /** Path glow color (rendered behind). */
  glow?: string;
  strokeWidth?: number;
  className?: string;
  /** Total animation duration in seconds. */
  duration?: number;
  /** When true, the path is fully drawn statically (used in reduced-motion). */
  forceStatic?: boolean;
}

export function AnimatedPath({
  d,
  color = 'var(--color-garden-path-core)',
  glow = 'var(--color-garden-path-mid)',
  strokeWidth = 2.5,
  className,
  duration = 3.6,
  forceStatic = false,
}: AnimatedPathProps) {
  const reducedMotion = useReducedMotion();
  const isStatic = forceStatic || reducedMotion;
  const filterId = useId();

  return (
    <svg
      className={cn('h-full w-full', className)}
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      aria-hidden
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Outer glow */}
      <path
        d={d}
        stroke={glow}
        strokeWidth={strokeWidth + 6}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
        opacity={0.6}
      />

      {/* Core stroke — animated dasharray */}
      {isStatic ? (
        <path
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <motion.path
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.7 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.4 },
          }}
        />
      )}
    </svg>
  );
}
