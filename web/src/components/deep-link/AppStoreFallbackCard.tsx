'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import {
  buildAppStoreUrl,
  buildTestFlightUrl,
} from '@/lib/deep-links/urls';

interface Props {
  visible?: boolean;
}

export function AppStoreFallbackCard({ visible = false }: Props) {
  const reducedMotion = useReducedMotion();
  const appStore = buildAppStoreUrl();
  const testflight = buildTestFlightUrl();
  if (!visible) return null;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard padding="md" className="!rounded-2xl text-center">
        <p className="section-eyebrow">Don&apos;t have the app?</p>
        <p className="mt-3 text-base text-[var(--color-text)]">
          Get Sudoku Evolved and open this duel from inside the app.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <PremiumButton size="md" variant="primary" href={appStore}>
            Download for iOS
          </PremiumButton>
          <PremiumButton size="md" variant="secondary" href={testflight}>
            Join TestFlight
          </PremiumButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}
