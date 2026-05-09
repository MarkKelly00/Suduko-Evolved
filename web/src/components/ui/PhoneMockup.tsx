import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
  /** Add a soft floating effect with subtle drop shadow. */
  floating?: boolean;
}

/**
 * Pure CSS iPhone bezel — no asset dependency. Children render inside the
 * screen viewport. Aspect ratio matches a modern iPhone (≈19.5:9).
 */
export function PhoneMockup({ children, className, floating = true }: PhoneMockupProps) {
  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-[88vw] sm:max-w-[380px] md:max-w-[320px]',
        floating && 'drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]',
        className,
      )}
      style={{ aspectRatio: '9 / 19.5' }}
    >
      {/* Bezel */}
      <div
        className={cn(
          'absolute inset-0 rounded-[3rem] p-[10px]',
          'bg-gradient-to-b from-[#1a2440] via-[#0f1727] to-[#080d18]',
          'border border-[rgba(255,255,255,0.08)]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_0_2px_rgba(0,0,0,0.4)]',
        )}
      >
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[2.4rem] bg-[var(--color-bg)]">
          {children}
          {/* Dynamic Island */}
          <div
            aria-hidden
            className="absolute left-1/2 top-2.5 z-20 h-6 w-[100px] -translate-x-1/2 rounded-full bg-black"
          />
        </div>
      </div>

      {/* Edge gold sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[3rem]"
        style={{
          background:
            'linear-gradient(135deg, rgba(245,213,138,0.18) 0%, transparent 30%, transparent 70%, rgba(245,213,138,0.08) 100%)',
          maskImage:
            'linear-gradient(135deg, black 0%, transparent 30%, transparent 70%, black 100%)',
          WebkitMaskImage:
            'linear-gradient(135deg, black 0%, transparent 30%, transparent 70%, black 100%)',
        }}
      />
    </div>
  );
}
