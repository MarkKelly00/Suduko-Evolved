import type { Metadata } from 'next';
import { LeaderboardTabs } from '@/components/leaderboard/LeaderboardTabs';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import {
  CAMPAIGN_LEVEL_IDS,
  getGlobalLeaderboardsByLevel,
  getTimeTrialLeaderboard,
  type CampaignLevelId,
} from '@/lib/supabase/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import type { LeaderboardRow } from '@/lib/supabase/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Leaderboards',
  description:
    'Top Sudoku Evolved solvers, ranked. Global, 3-Minute Sprint, Duels, Friends.',
};

const EMPTY_GLOBALS = CAMPAIGN_LEVEL_IDS.reduce(
  (acc, id) => {
    acc[id] = [];
    return acc;
  },
  {} as Record<CampaignLevelId, LeaderboardRow[]>,
);

export default async function LeaderboardsPage() {
  const configured = isSupabaseConfigured();
  const [globalsByLevel, sprint] = configured
    ? await Promise.all([
        getGlobalLeaderboardsByLevel(25),
        getTimeTrialLeaderboard('sprint-3min', '', 25),
      ])
    : [EMPTY_GLOBALS, [] as LeaderboardRow[]];

  return (
    <>
      <SiteHeader />
      <main className="relative px-6 py-12 md:py-16">
        <LogicGardenBackdrop />
        <div className="relative mx-auto max-w-3xl">
          <SectionEyebrow>Leaderboards</SectionEyebrow>
          <h1 className="mt-4 serif-display text-4xl md:text-5xl text-glow-gold">
            Climb the board.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)]">
            Cleanest solves rise to the top. Global rankings here are a public
            preview — sign in inside the app for friends, duel records, and
            personal best progress.
          </p>

          <div className="mt-10">
            <LeaderboardTabs
              globalsByLevel={globalsByLevel}
              sprint={sprint}
              configured={configured}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
