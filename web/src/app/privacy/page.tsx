import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';
import { PRODUCT_NAME, SUPPORT_EMAIL } from '@/lib/brand/copy';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${PRODUCT_NAME} collects, uses, and protects your data.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="A short, plain-language summary of what data Sudoku Evolved handles, why, and what your choices are."
    >
      <Section title="Summary">
        <p>
          Sudoku Evolved is a single-player puzzle game with optional online
          features. You can play without an account. If you sign in, we sync
          your progress and let you appear on leaderboards and in friend
          duels. We don&apos;t sell your data and we don&apos;t show ads.
        </p>
      </Section>

      <Section title="What we collect">
        <ul>
          <li>
            <strong>Game progress</strong>: levels cleared, stars, crowns,
            time-trial scores, streaks. Stored locally; synced to our backend
            (Supabase) when you sign in.
          </li>
          <li>
            <strong>Profile</strong>: display name, username, avatar (if you
            set one), and an account ID. Visible on public leaderboards and
            public profiles unless you switch your privacy level to
            &quot;friends&quot; or &quot;private.&quot;
          </li>
          <li>
            <strong>Sign-in identifier</strong>: when you sign in with Apple
            or Google, we receive a stable identifier from the provider. We
            do not store your password.
          </li>
          <li>
            <strong>Diagnostic data</strong>: crash logs and minimal performance
            telemetry to keep the app stable. Not associated with your account
            beyond what your platform (iOS) provides.
          </li>
        </ul>
      </Section>

      <Section title="What we don't do">
        <ul>
          <li>We don&apos;t sell or share your personal data with advertisers.</li>
          <li>We don&apos;t serve ads.</li>
          <li>We don&apos;t track you across other apps and websites.</li>
        </ul>
      </Section>

      <Section title="Third parties">
        <ul>
          <li>
            <strong>Supabase</strong> hosts our database, authentication, and
            real-time duel rooms.
          </li>
          <li>
            <strong>Apple</strong> and <strong>Google</strong> handle sign-in
            if you choose to use them.
          </li>
        </ul>
      </Section>

      <Section title="Your choices">
        <ul>
          <li>
            <strong>Privacy level</strong>: in-app, switch your profile
            between Public, Friends, and Private.
          </li>
          <li>
            <strong>Delete</strong>: in-app, request account deletion under
            Settings → Account → Delete account. See the{' '}
            <a className="underline" href="/delete-account">
              delete-account page
            </a>{' '}
            for details.
          </li>
          <li>
            <strong>Email</strong>: write to{' '}
            <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{' '}
            with any privacy question or request.
          </li>
        </ul>
      </Section>

      <Section title="Children">
        <p>
          Sudoku Evolved is not directed at children under 13. If you believe
          a child has provided us with personal data, contact us and we will
          remove it.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We&apos;ll update this page if we change our practices. Material
          changes will be reflected with a fresh &quot;Last updated&quot; date
          and, where appropriate, an in-app notice.
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
