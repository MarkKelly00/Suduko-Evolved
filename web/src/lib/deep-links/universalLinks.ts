/**
 * Apple App Site Association payload.
 *
 * iOS app config (confirmed in /app.json):
 *   appleTeamId      = B4H49GDQ8Q
 *   bundleIdentifier = com.sudokuevolved.app
 *
 * The full appID format is "TEAM_ID.bundleID".
 *
 * IMPORTANT:
 *   - Only register specific path components — NOT "/" — or every link to
 *     sudokuevolved.com from another iOS app would yank users into the game.
 *   - The route handler must serve this with HTTP 200 and Content-Type
 *     application/json. Apple will silently ignore the AASA on any redirect.
 *   - Vercel domain config MUST keep apex (sudokuevolved.com) canonical and
 *     www 308-redirecting to it. The iOS entitlement should only register
 *     `applinks:sudokuevolved.com` — Apple won't follow www's 308 redirect
 *     on the AASA fetch.
 */

const TEAM_ID = 'B4H49GDQ8Q';
const BUNDLE_ID = 'com.sudokuevolved.app';

export const aasaPayload = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: [`${TEAM_ID}.${BUNDLE_ID}`],
        components: [
          { '/': '/duel/*', comment: 'Duel invite landing pages' },
          { '/': '/u/*', comment: 'Public profile pages' },
          { '/': '/leaderboards', comment: 'Leaderboards' },
        ],
      },
    ],
  },
} as const;
