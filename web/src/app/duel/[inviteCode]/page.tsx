import type { Metadata } from 'next';
import { DuelInviteLanding } from '@/components/deep-link/DuelInviteLanding';
import { InviteExpiredState } from '@/components/deep-link/InviteExpiredState';
import { LogicGardenBackdrop } from '@/components/marketing/LogicGardenBackdrop';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { getDuelInvitePreview } from '@/lib/supabase/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { PRODUCT_NAME } from '@/lib/brand/copy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ inviteCode: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { inviteCode } = await params;
  let challenger: string | null = null;
  if (isSupabaseConfigured()) {
    const preview = await getDuelInvitePreview(inviteCode);
    challenger =
      preview?.challenger_display_name ||
      (preview?.challenger_username ? `@${preview.challenger_username}` : null);
  }
  const title = challenger
    ? `${challenger} challenged you · ${PRODUCT_NAME}`
    : `You've been challenged · ${PRODUCT_NAME}`;
  const description = challenger
    ? `${challenger} wants to race you on the same Sudoku grid in real time. Open the app to accept the duel.`
    : 'Open Sudoku Evolved to race the same Sudoku grid in real time.';
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function DuelInvitePage({ params }: PageProps) {
  const { inviteCode } = await params;
  const preview = isSupabaseConfigured() ? await getDuelInvitePreview(inviteCode) : null;

  let body: React.ReactNode;

  if (!isSupabaseConfigured()) {
    // Generic landing — Supabase not configured. Still offer Open in App.
    body = <DuelInviteLanding inviteCode={inviteCode} preview={null} />;
  } else if (!preview) {
    body = <InviteExpiredState variant="invalid" />;
  } else if (
    preview.status === 'expired' ||
    new Date(preview.expires_at).getTime() < Date.now()
  ) {
    body = <InviteExpiredState variant="expired" />;
  } else if (preview.status === 'accepted' || preview.status === 'declined') {
    body = <InviteExpiredState variant="consumed" />;
  } else {
    body = <DuelInviteLanding inviteCode={inviteCode} preview={preview} />;
  }

  return (
    <>
      <SiteHeader />
      <main className="relative px-6 py-16 md:py-24">
        <LogicGardenBackdrop />
        <div className="relative mx-auto max-w-2xl">{body}</div>
      </main>
      <SiteFooter />
    </>
  );
}
