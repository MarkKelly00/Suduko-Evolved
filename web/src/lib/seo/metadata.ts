import type { Metadata } from 'next';
import { META_DESCRIPTION, PRODUCT_NAME, TAGLINE } from '@/lib/brand/copy';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sudokuevolved.com';

export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${PRODUCT_NAME} — ${TAGLINE}`,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: META_DESCRIPTION,
  applicationName: PRODUCT_NAME,
  authors: [{ name: PRODUCT_NAME }],
  generator: 'Next.js',
  keywords: [
    'Sudoku',
    'Sudoku Evolved',
    'cinematic Sudoku',
    'Logic Garden',
    'Sudoku duels',
    'Time Trial Sudoku',
    'iOS Sudoku',
    'premium Sudoku',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: PRODUCT_NAME,
    title: `${PRODUCT_NAME} — ${TAGLINE}`,
    description: META_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PRODUCT_NAME} — ${TAGLINE}`,
    description: META_DESCRIPTION,
  },
  // No manual `icons` block — Next.js App Router auto-injects icon links
  // from src/app/icon.png (browser tab favicon), src/app/apple-icon.png
  // (iOS Add-to-Home-Screen), and public/favicon.ico (legacy fallback).
  // Adding entries here would compete with those filename conventions.
  robots: {
    index: true,
    follow: true,
  },
};
