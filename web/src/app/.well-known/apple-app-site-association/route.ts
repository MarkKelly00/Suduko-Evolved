import { NextResponse } from 'next/server';
import { aasaPayload } from '@/lib/deep-links/universalLinks';

/**
 * Apple App Site Association — required for iOS Universal Links.
 *
 * The path is intentionally `/.well-known/apple-app-site-association` with
 * no `.json` extension. Apple fetches this URL exactly. Do NOT redirect.
 * Do NOT add a trailing slash.
 */
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(aasaPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
