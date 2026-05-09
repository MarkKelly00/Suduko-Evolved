import { HeroSection } from '@/components/marketing/HeroSection';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import { SagaMapShowcase } from '@/components/marketing/SagaMapShowcase';
import { GameplayShowcase } from '@/components/marketing/GameplayShowcase';
import { TimeTrialShowcase } from '@/components/marketing/TimeTrialShowcase';
import { FriendsLeaderboardShowcase } from '@/components/marketing/FriendsLeaderboardShowcase';
import { PrivacyTrustSection } from '@/components/marketing/PrivacyTrustSection';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <FeatureGrid />
        <SagaMapShowcase />
        <GameplayShowcase />
        <TimeTrialShowcase />
        <FriendsLeaderboardShowcase />
        <PrivacyTrustSection />
        <FinalCTA />
      </main>
      <SiteFooter />
    </>
  );
}
