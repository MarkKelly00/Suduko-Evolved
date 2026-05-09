import { NextResponse } from 'next/server';
import { assetLinksPayload } from '@/lib/deep-links/appLinks';

/**
 * Android Digital Asset Links — scaffold for App Links.
 *
 * The SHA256 fingerprint is a placeholder. Replace it with the production
 * Play Console fingerprint before going live, per /docs/website-deployment.md.
 */
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(assetLinksPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
