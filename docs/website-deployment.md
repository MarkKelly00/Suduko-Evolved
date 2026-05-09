# Sudoku Evolved Website — Deployment Guide

This document is the source of truth for deploying [sudokuevolved.com](https://sudokuevolved.com)
from the Next.js project at [`/web`](../web). The Expo iOS app is unaffected by anything
documented here.

## TL;DR checklist

- [ ] Deploy [`/web`](../web) to Vercel with **Root Directory = `web`**.
- [ ] Wire DNS for `sudokuevolved.com` (apex) and `www.sudokuevolved.com` (CNAME redirect).
- [ ] Set Vercel env vars (see below) — **anon Supabase key only**, never service role.
- [ ] Apply [`db/008_public_duel_preview.sql`](../db/008_public_duel_preview.sql) to the production Supabase project (`riwfohmydwwsgvnhnzfd`).
- [ ] Confirm `/.well-known/apple-app-site-association` returns 200 + `application/json` with no redirect.
- [ ] **iOS app follow-up** (required for Universal Links to actually fire): add `applinks:sudokuevolved.com` to [`ios/SudokuEvolved/SudokuEvolved.entitlements`](../ios/SudokuEvolved/SudokuEvolved.entitlements) and rebuild. Only the apex — `www.sudokuevolved.com` 308-redirects to apex and shouldn't be in the entitlement (Apple doesn't follow redirects on AASA fetch).
- [ ] **Android follow-up**: replace placeholder SHA256 in [`web/src/lib/deep-links/appLinks.ts`](../web/src/lib/deep-links/appLinks.ts) with the production Play Console fingerprint.

## 1. Vercel project setup

1. Visit [vercel.com/new](https://vercel.com/new) and import the GitHub repo `MarkKelly00/SudokuEvolved`.
2. **Root Directory** must be set to `web`. This is the most important setting — without it, Vercel will try to build the Expo project at the root.
3. Framework Preset: `Next.js` (auto-detected once Root Directory is set).
4. Build & Output: leave defaults. The included `web/vercel.json` adds the required `Content-Type` headers for the `.well-known` routes.

## 2. DNS

| Hostname | Record | Target |
|---|---|---|
| `sudokuevolved.com` | A | Vercel apex IP (Vercel will show the value in the Domains tab) |
| `www.sudokuevolved.com` | CNAME | `cname.vercel-dns.com` |

Add both domains in Vercel → Project → Domains. **`sudokuevolved.com` (apex) must be the canonical / primary domain — `www.sudokuevolved.com` should 308-redirect to apex.** This direction is non-negotiable: Apple does not follow redirects on AASA fetch, so the apex must serve `/.well-known/apple-app-site-association` at HTTP 200, and the iOS app generates duel URLs as apex (`https://sudokuevolved.com/duel/<code>`).

If you ever see `sudokuevolved.com` redirecting to `www.sudokuevolved.com`, swap it via API:

```bash
TOKEN="<your vercel token>"
TEAM="team_bLNcKj8mS6k34V48GsedRniZ"
PROJ="prj_zl2QvrwG8P6EN1U2ZlOcEBR1leDN"
curl -X PATCH "https://api.vercel.com/v9/projects/$PROJ/domains/sudokuevolved.com?teamId=$TEAM" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"redirect":null,"redirectStatusCode":null}'
curl -X PATCH "https://api.vercel.com/v9/projects/$PROJ/domains/www.sudokuevolved.com?teamId=$TEAM" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"redirect":"sudokuevolved.com","redirectStatusCode":308}'
```

## 3. Environment variables

Set in Vercel → Project → Settings → Environment Variables. All variables are **public** (`NEXT_PUBLIC_*`); the marketing site never holds a service-role key.

| Variable | Purpose | Required? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL — `https://sudokuevolved.com` | yes |
| `NEXT_PUBLIC_APP_SCHEME` | Custom URL scheme — `sudokuevolved` | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project as the iOS app | optional — site degrades gracefully without it |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon public key. Never service-role. | optional — site degrades gracefully without it |
| `NEXT_PUBLIC_IOS_APP_STORE_URL` | App Store URL once live | optional — CTAs render "Coming soon" if missing |
| `NEXT_PUBLIC_TESTFLIGHT_URL` | TestFlight invite URL | optional |
| `NEXT_PUBLIC_ANDROID_PLAY_STORE_URL` | Play Store URL when Android ships | optional |

## 4. Supabase migration

The `/duel/[inviteCode]` page calls a new SECURITY DEFINER RPC that returns a public-safe preview of an invite. Apply the migration once:

```bash
# Via Supabase SQL editor:
# 1. Open https://supabase.com/dashboard/project/riwfohmydwwsgvnhnzfd/sql
# 2. Paste the contents of db/008_public_duel_preview.sql
# 3. Run.

# Or via supabase CLI (if linked):
supabase db push
```

Verify:

```sql
-- Should return 0 rows for an unknown code, not error
select * from public.preview_duel_invite_public('nonexistent');

-- For a real invite code:
select * from public.preview_duel_invite_public('<real code>');
-- Should return exactly the safe-public columns:
-- invite_code, status, mode, expires_at, created_at,
-- challenger_username, challenger_display_name, challenger_avatar_url
```

This RPC is read-only. The website **never** calls `redeem_duel_invite` (that mutates state and consumes the invite). The app continues to use `redeem_duel_invite` exclusively.

## 5. Apple Universal Links

### What's already done by the website

- `/.well-known/apple-app-site-association` returns the AASA payload with `appID` `B4H49GDQ8Q.com.sudokuevolved.app` and components matching `/duel/*`, `/u/*`, and `/leaderboards`.
- The route handler returns `Content-Type: application/json` and HTTP 200 — Apple silently rejects AASA on any redirect or wrong content type.
- The home path `/` is intentionally **not** registered as a Universal Link target. Otherwise tapping any link to `sudokuevolved.com` from another iOS app would yank users into the game.

### What you must do in the iOS app

Apple Universal Links require **both sides** of the handshake. The website is one half. The other half is the iOS app declaring which domains it accepts links from. The repo currently has an empty `Associated Domains` entitlement.

Edit [`ios/SudokuEvolved/SudokuEvolved.entitlements`](../ios/SudokuEvolved/SudokuEvolved.entitlements) and add:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:sudokuevolved.com</string>
</array>
```

**Only the apex.** Do not add `applinks:www.sudokuevolved.com` — the www subdomain 308-redirects to apex, and Apple does not follow redirects on the AASA fetch. The iOS app generates duel URLs as `https://sudokuevolved.com/duel/<code>` (apex), so apex registration is sufficient.

Then rebuild the app:

```bash
# From the repo root
npx expo prebuild --clean
cd ios && pod install && cd ..
# Re-archive in Xcode and resubmit to App Store Connect / TestFlight
```

### Verification

After Vercel deploy:

```bash
curl -i https://sudokuevolved.com/.well-known/apple-app-site-association
# Expected: HTTP/2 200, content-type: application/json, JSON body containing
#   "appIDs": ["B4H49GDQ8Q.com.sudokuevolved.app"]
# Critical: NO 301/308. NO trailing slash redirect.
```

After re-installing the iOS app on a device:

1. Send yourself a duel link from the iOS app.
2. Open the link in a *different* app (e.g. Notes, Mail, iMessage to yourself).
3. Tap. The Sudoku Evolved app should launch directly into the duel join screen.

If iOS opens Safari instead, check [Apple's AASA validator](https://search.developer.apple.com/appsearch-validation-tool/) and confirm the entitlement was added before the most recent install.

## 6. Android App Links

Scaffold only — full setup is deferred until the Android build ships.

### What's done

- `/.well-known/assetlinks.json` returns a valid Digital Asset Links payload for package `com.sudokuevolved.app` with a placeholder SHA256.

### Production checklist (when shipping Android)

1. Get the production cert SHA256 from Play Console → Release → Setup → App integrity.
2. Replace `REPLACE_ME_WITH_PRODUCTION_SHA256` in [`web/src/lib/deep-links/appLinks.ts`](../web/src/lib/deep-links/appLinks.ts).
3. Add `<intent-filter android:autoVerify="true">` blocks to the Android manifest mapping the same paths.
4. Verify with: `adb shell pm get-app-links com.sudokuevolved.app`.

## 7. Health checks after deploy

```bash
# Homepage
curl -I https://sudokuevolved.com

# Universal Links
curl -i https://sudokuevolved.com/.well-known/apple-app-site-association

# Android App Links
curl -i https://sudokuevolved.com/.well-known/assetlinks.json

# OG image renders (slow first time; cached after)
curl -I https://sudokuevolved.com/opengraph-image

# Sitemap
curl -I https://sudokuevolved.com/sitemap.xml
```

Manual:

- Visit `/` and confirm the hero says **Sudoku Evolved** (full name, never just "Sudoku") with the tagline *"Pure logic. Cinematic feel."*.
- Visit `/duel/whatever-code` and confirm the page renders even if Supabase is unconfigured.
- Visit `/leaderboards` and confirm tabs render and degrade gracefully when Supabase env vars are missing.
- macOS Reduce Motion → ON → reload `/` → animations should stop or simplify.

## 8. Open follow-ups (out of scope for the initial launch)

- iOS `Associated Domains` entitlement update (above).
- Android cert fingerprint replacement (above).
- Real device screenshots for marketing sections (currently CSS-rendered).
- Localization beyond English.
- Account-recovery / password-reset on the web (intentionally not on the marketing site).

— Keep this file in sync with `web/.env.example` and `db/008_public_duel_preview.sql`.
