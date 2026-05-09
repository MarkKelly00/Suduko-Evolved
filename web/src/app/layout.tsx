import type { Metadata, Viewport } from 'next';
import { defaultMetadata } from '@/lib/seo/metadata';
import './globals.css';

export const metadata: Metadata = defaultMetadata;

export const viewport: Viewport = {
  themeColor: '#0B1220',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="bg-bg text-text min-h-dvh font-[family-name:var(--font-text)] antialiased">
        {children}
      </body>
    </html>
  );
}
