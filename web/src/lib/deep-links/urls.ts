/**
 * Deep-link URL helpers — single source of truth for both schemes the app
 * accepts (custom + Universal Link). Mirrors the contract used by
 * /src/services/duel/duelInviteService.ts and the iOS deep-link router.
 */

const APP_SCHEME = process.env.NEXT_PUBLIC_APP_SCHEME || 'sudokuevolved';
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://sudokuevolved.com';

export function buildAppSchemeDuelUrl(inviteCode: string): string {
  return `${APP_SCHEME}://duel/${encodeURIComponent(inviteCode)}`;
}

export function buildUniversalLinkDuelUrl(inviteCode: string): string {
  return `${SITE_URL}/duel/${encodeURIComponent(inviteCode)}`;
}

export function buildAppSchemeProfileUrl(username: string): string {
  return `${APP_SCHEME}://u/${encodeURIComponent(username)}`;
}

/**
 * Canonical App Store listing for Sudoku Evolved (Apple ID 6767898840). Baked
 * in as the default so production CTAs link out of the box without depending on
 * a deploy-time env var; `NEXT_PUBLIC_IOS_APP_STORE_URL` still overrides it for
 * staging or regional storefront variants.
 */
const DEFAULT_IOS_APP_STORE_URL =
  'https://apps.apple.com/us/app/sudoku-evolved/id6767898840';

export function buildAppStoreUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_IOS_APP_STORE_URL;
  return url && url.length > 0 ? url : DEFAULT_IOS_APP_STORE_URL;
}

export function buildTestFlightUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_TESTFLIGHT_URL;
  return url && url.length > 0 ? url : undefined;
}

export function buildPlayStoreUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL;
  return url && url.length > 0 ? url : undefined;
}

/** Best available iOS install/open URL for fallback CTAs. */
export function getBestIosCtaUrl(): string | undefined {
  return buildAppStoreUrl() ?? buildTestFlightUrl();
}
