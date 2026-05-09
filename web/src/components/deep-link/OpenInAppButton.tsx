'use client';

import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { buildAppSchemeDuelUrl } from '@/lib/deep-links/urls';
import { cn } from '@/lib/utils';

interface OpenInAppButtonProps {
  inviteCode: string;
  /** Called after the fallback timer fires (i.e. app likely not installed). */
  onFallback?: () => void;
  className?: string;
  label?: string;
}

const FALLBACK_MS = 1500;

/**
 * Triggers the iOS app via custom scheme. If the page is still visible
 * after a short timeout we assume the app didn't open and surface the
 * fallback CTA via `onFallback`.
 *
 * Universal Links would be the *primary* mechanism in production; the
 * scheme is the deterministic fallback when the user already has the app
 * but reaches this URL outside iOS Safari.
 */
export function OpenInAppButton({
  inviteCode,
  onFallback,
  className,
  label = 'Open in Sudoku Evolved',
}: OpenInAppButtonProps) {
  const [pressed, setPressed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityChangedAfterClick = useRef(false);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && pressed) {
        visibilityChangedAfterClick.current = true;
        if (timer.current) clearTimeout(timer.current);
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pressed]);

  const onClick = () => {
    setPressed(true);
    visibilityChangedAfterClick.current = false;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!visibilityChangedAfterClick.current) {
        onFallback?.();
      }
    }, FALLBACK_MS);
  };

  const href = buildAppSchemeDuelUrl(inviteCode);

  return (
    <PremiumButton
      size="lg"
      variant="primary"
      href={href}
      external
      onClick={onClick}
      className={cn(className)}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </PremiumButton>
  );
}
