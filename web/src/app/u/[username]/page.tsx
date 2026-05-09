import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { PublicProfileHeader } from '@/components/profile/PublicProfileHeader';
import { PublicStatsGrid } from '@/components/profile/PublicStatsGrid';
import { PublicRecentScores } from '@/components/profile/PublicRecentScores';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { PremiumButton } from '@/components/ui/PremiumButton';
import {
  getPublicProfileByUsername,
  getRecentScoresForUser,
} from '@/lib/supabase/queries';
import { getBestIosCtaUrl } from '@/lib/deep-links/urls';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { PRODUCT_NAME } from '@/lib/brand/copy';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  if (!isSupabaseConfigured()) {
    return {
      title: `@${username} · ${PRODUCT_NAME}`,
      robots: { index: false, follow: true },
    };
  }
  const profile = await getPublicProfileByUsername(username);
  if (!profile) {
    return {
      title: `Profile · ${PRODUCT_NAME}`,
      robots: { index: false, follow: false },
    };
  }
  const name = profile.display_name || `@${profile.username}`;
  return {
    title: `${name} · ${PRODUCT_NAME}`,
    description: `${name}'s public Sudoku Evolved profile · ${profile.crowns_total} crowns · ${profile.levels_cleared} levels cleared.`,
    openGraph: {
      title: `${name} · ${PRODUCT_NAME}`,
      description: `${profile.crowns_total} crowns · ${profile.streak}-day streak`,
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <UnconfiguredFallback username={username} />
    );
  }

  const profile = await getPublicProfileByUsername(username);
  if (!profile) notFound();

  const scores =
    profile.privacy_level === 'public'
      ? await getRecentScoresForUser(profile.id)
      : [];

  return (
    <>
      <SiteHeader />
      <main className="relative px-6 py-12 md:py-16">
        <LogicGardenBackdrop />
        <div className="relative mx-auto max-w-3xl space-y-6">
          <PublicProfileHeader profile={profile} />
          <PublicStatsGrid profile={profile} />
          {profile.privacy_level === 'public' && (
            <PublicRecentScores scores={scores} />
          )}
          <CTAFooter />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function CTAFooter() {
  const iosUrl = getBestIosCtaUrl();
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
      <PremiumButton size="md" variant="primary" href={iosUrl}>
        Open in Sudoku Evolved
        <ArrowRight className="h-4 w-4" />
      </PremiumButton>
      <PremiumButton size="md" variant="secondary" href="/leaderboards">
        Browse leaderboards
      </PremiumButton>
    </div>
  );
}

function UnconfiguredFallback({ username }: { username: string }) {
  const iosUrl = getBestIosCtaUrl();
  return (
    <>
      <SiteHeader />
      <main className="relative px-6 py-16 md:py-24">
        <LogicGardenBackdrop />
        <div className="relative mx-auto max-w-2xl">
          <div className="glass-card !rounded-3xl p-8 text-center">
            <p className="section-eyebrow">Profile</p>
            <h1 className="mt-4 serif-display text-3xl md:text-4xl text-[var(--color-text)]">
              @{username}
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base text-[var(--color-text-muted)]">
              Public profiles are powered by the in-app Supabase backend.
              Open Sudoku Evolved to see this player&apos;s stats.
            </p>
            <div className="mt-8 flex justify-center">
              <PremiumButton size="md" variant="primary" href={iosUrl}>
                Download for iOS
              </PremiumButton>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
