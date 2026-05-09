import type { Metadata } from 'next';
import { LeaderboardTabs } from '@/components/leaderboard/LeaderboardTabs';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import {
  getGlobalLeaderboard,
  getTimeTrialLeaderboard,
} from '@/lib/supabase/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Leaderboards',
  description:
    'Top Sudoku Evolved solvers, ranked. Global, 3-Minute Sprint, Duels, Friends.',
};

export default async function LeaderboardsPage() {
  const configured = isSupabaseConfigured();
  const [global, sprint] = configured
    ? await Promise.all([
        getGlobalLeaderboard('world1-level-1', 25),
        getTimeTrialLeaderboard('sprint_3min', '', 25),
      ])
    : [[], []];

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
              global={global}
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
