import type { Metadata } from 'next';
import { Mail, MessageCircle } from 'lucide-react';
import { LegalPage } from '@/components/marketing/LegalPage';
import { PRODUCT_NAME, SUPPORT_EMAIL } from '@/lib/brand/copy';

export const metadata: Metadata = {
  title: 'Support',
  description: `Get help with ${PRODUCT_NAME}.`,
};

export default function SupportPage() {
  const subject = encodeURIComponent('Sudoku Evolved support request');
  const body = encodeURIComponent(
    `Device:\niOS version:\nApp version:\n\nWhat happened:\n\nWhat I expected:\n\n`,
  );
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <LegalPage
      eyebrow="Support"
      title="We're here to help."
      intro="Whether something looks off, a duel won't connect, or you have an idea for what's next — we'd love to hear from you."
    >
      <div className="not-prose space-y-3">
        <a
          href={mailto}
          className="flex items-center gap-3 rounded-2xl border border-[rgba(224,185,106,0.3)] bg-[rgba(224,185,106,0.06)] px-5 py-4 transition-colors hover:bg-[rgba(224,185,106,0.1)]"
        >
          <Mail className="h-5 w-5 text-[var(--color-gold-glow)]" />
          <div className="flex-1">
            <p className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-text)]">
              Email support
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">{SUPPORT_EMAIL}</p>
          </div>
        </a>
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-glass-border)] bg-[var(--color-glass-fill)] px-5 py-4">
          <MessageCircle className="mt-1 h-5 w-5 text-[var(--color-text-muted)]" />
          <div>
            <p className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-text)]">
              In-app feedback
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              In Settings → Help, you can send a quick note that includes your
              device and app version. It&apos;s the fastest way for us to
              reproduce an issue.
            </p>
          </div>
        </div>
      </div>

      <FaqSection />
    </LegalPage>
  );
}

function FaqSection() {
  const faqs = [
    {
      q: 'Why didn\'t my duel link open the app?',
      a: 'You need an iOS device with Sudoku Evolved installed. If you have it installed and the link still doesn\'t open, restart the app, then tap the link again. We\'re working with Apple\'s Universal Links, which can take a moment to register after first install.',
    },
    {
      q: 'How do I see my friends?',
      a: 'Sign in with Apple or Google in the app. Friends, duel records, and the friends leaderboard live inside Sudoku Evolved.',
    },
    {
      q: 'Can I play offline?',
      a: 'Yes — the campaign and Time Trials work offline. Online duels and leaderboards need a network connection.',
    },
    {
      q: 'How do I delete my account?',
      a: 'In-app: Settings → Account → Delete account. Or email us — see the delete-account page for details.',
    },
  ] as const;

  return (
    <section>
      <h2 className="serif-display text-xl text-[var(--color-gold-glow)]">FAQ</h2>
      <div className="mt-4 space-y-4">
        {faqs.map((f) => (
          <div key={f.q}>
            <p className="font-semibold text-[var(--color-text)]">{f.q}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {f.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
