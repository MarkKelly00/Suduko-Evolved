import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';
import { PRODUCT_NAME, SUPPORT_EMAIL } from '@/lib/brand/copy';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: `Terms of use for ${PRODUCT_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Use">
      <Section title="Welcome">
        <p>
          These terms govern your use of {PRODUCT_NAME} (&quot;the Service&quot;).
          By installing or using the app, you agree to these terms. If you
          don&apos;t agree, please don&apos;t use the Service.
        </p>
      </Section>

      <Section title="Your account">
        <ul>
          <li>You may use guest play without an account.</li>
          <li>
            If you create an account (via Apple or Google), keep your
            sign-in credentials safe. You&apos;re responsible for activity on
            your account.
          </li>
          <li>
            You may not impersonate others, harass other players, post
            offensive usernames or display names, or attempt to manipulate
            leaderboards.
          </li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <ul>
          <li>Don&apos;t reverse-engineer, decompile, or tamper with the Service.</li>
          <li>Don&apos;t use bots, scripts, or automation to play.</li>
          <li>Don&apos;t exploit duel matchmaking or leaderboards in bad faith.</li>
          <li>Don&apos;t use the Service for anything illegal.</li>
        </ul>
      </Section>

      <Section title="Intellectual property">
        <p>
          {PRODUCT_NAME}, its branding, artwork, and software are protected
          intellectual property. We grant you a personal, non-exclusive,
          revocable license to use the app on your devices for personal,
          non-commercial use.
        </p>
      </Section>

      <Section title="Changes to the Service">
        <p>
          We may update, suspend, or discontinue features at our discretion.
          We&apos;ll do our best to give notice of material changes.
        </p>
      </Section>

      <Section title="Disclaimer & liability">
        <p>
          The Service is provided &quot;as is&quot; without warranties of any
          kind. To the fullest extent permitted by law, we are not liable for
          indirect or consequential damages arising from your use of the
          Service.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          You can stop using the Service at any time and delete your account
          via the in-app settings or by emailing{' '}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          . We may suspend accounts that violate these terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions? Reach us at{' '}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="serif-display text-xl text-[var(--color-gold-glow)]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--color-text-muted)] [&_strong]:text-[var(--color-text)] [&_a]:text-[var(--color-gold-glow)] [&_a:hover]:text-[var(--color-gold)] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mt-2">
        {children}
      </div>
    </section>
  );
}
