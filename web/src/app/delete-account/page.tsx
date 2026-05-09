import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PRODUCT_NAME, SUPPORT_EMAIL } from '@/lib/brand/copy';
import { getBestIosCtaUrl } from '@/lib/deep-links/urls';

export const metadata: Metadata = {
  title: 'Delete Account',
  description: `How to delete your ${PRODUCT_NAME} account and the data associated with it.`,
};

export default function DeleteAccountPage() {
  const subject = encodeURIComponent('Account deletion request — Sudoku Evolved');
  const body = encodeURIComponent(
    `I'd like to delete my Sudoku Evolved account.\n\nUsername / display name (so we can find it):\nApple/Google email used for sign-in:\n\nThanks!`,
  );
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  const iosUrl = getBestIosCtaUrl();

  return (
    <LegalPage
      eyebrow="Account"
      title="Delete your account."
      intro="You can delete your Sudoku Evolved account and all associated data at any time. There's no charge and no waiting list — just a confirmation step."
    >
      <Section title="The fastest way: in the app">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-text-muted)]">
          <li>Open Sudoku Evolved on your iPhone.</li>
          <li>
            Go to <strong className="text-[var(--color-text)]">Settings</strong>{' '}
            → <strong className="text-[var(--color-text)]">Account</strong>.
          </li>
          <li>
            Tap{' '}
            <strong className="text-[var(--color-text)]">Delete account</strong>{' '}
            and confirm.
          </li>
        </ol>
        <div className="mt-5 flex justify-center sm:justify-start">
          <PremiumButton size="md" variant="primary" href={iosUrl}>
            Open the app
          </PremiumButton>
        </div>
      </Section>

      <Section title="Don't have the app handy?">
        <p>
          Email us at{' '}
          <a className="underline" href={mailto}>
            {SUPPORT_EMAIL}
          </a>
          . Include the username or display name you use in the app and the
          email tied to your Apple or Google sign-in so we can find your
          account.
        </p>
      </Section>

      <Section title="What gets deleted">
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--color-text-muted)]">
          <li>Your profile (username, display name, avatar).</li>
          <li>Your level scores, time-trial scores, stars, crowns, and streaks.</li>
          <li>Your friend graph and pending duel invites.</li>
          <li>Your authentication identifier from Apple/Google.</li>
        </ul>
        <p>
          Some anonymized aggregates (e.g. global rank counts) may persist
          without any link to you. We may retain limited records as required
          by law or to prevent abuse.
        </p>
      </Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="serif-display text-xl text-[var(--color-gold-glow)]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--color-text-muted)] [&_strong]:text-[var(--color-text)] [&_a]:text-[var(--color-gold-glow)] [&_a:hover]:text-[var(--color-gold)]">
        {children}
      </div>
    </section>
  );
}
