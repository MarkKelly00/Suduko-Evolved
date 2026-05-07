# Social Layer Setup

The Supabase project, SQL schema, RLS policies, storage bucket, edge function
placeholders, and TypeScript types were provisioned automatically. The steps
below cover the user-owned dashboards that can't be touched by the MCP and
must be done by hand before Apple / Google sign-in works on a built device.

| Step | When |
|---|---|
| Apple Developer "Sign In with Apple" capability | Before any TestFlight build |
| Google Cloud OAuth client IDs | Before any device test of Google sign-in |
| Supabase Auth provider config | After Apple + Google client IDs exist |
| `npx expo prebuild --clean --platform ios` | After deps install (regenerates iOS project with the new auth plugins) |

## 1. Apple Developer

1. Sign in to https://developer.apple.com
2. **Identifiers → App IDs → +** (Register a new App ID)
3. Description: `Sudoku Evolved`. Bundle ID: **Explicit** = `com.sudokuevolved.app`
4. Scroll to capabilities and check **Sign In with Apple**
5. Click **Edit** next to Sign In with Apple → keep "Enable as a primary App ID" selected
6. **Leave the Server-to-Server Notification Endpoint BLANK.** It is optional and only needed if you want webhooks when users delete their Apple ID. Skip it.
7. Save → Continue → Register

You do **NOT** need a Service ID or a Keys → Sign in with Apple key. Those are only required if you implement Sign in with Apple from a website. Native iOS uses the bundle ID directly.

## 2. Google Cloud Console

1. Open https://console.cloud.google.com → APIs & Services → Credentials.
2. Create credentials → OAuth client ID → **iOS**.
   - Bundle ID: `com.sudokuevolved.app`
   - Save. The plist contains `CLIENT_ID` (used for `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) and `REVERSED_CLIENT_ID` (used as the iOS URL scheme in [app.json](../app.json)).
3. Create credentials → OAuth client ID → **Web application**.
   - Authorized redirect URI: `https://riwfohmydwwsgvnhnzfd.supabase.co/auth/v1/callback`
   - Save. Copy the Web client ID (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) and Web client **secret** — you'll paste the secret into Supabase → Authentication → Providers → Google.

The current `.env` already has both client IDs. The Web **secret** never goes into the app — it's only pasted into Supabase.

## 3. Supabase Auth Providers

Open https://supabase.com/dashboard/project/riwfohmydwwsgvnhnzfd/auth/providers

### Apple — native iOS only

| Field | Value |
|---|---|
| Enable Sign in with Apple | **on** |
| Client IDs | `com.sudokuevolved.app` |
| Secret Key (for OAuth) | **leave blank** — only needed for the web flow |
| Allow users without an email | leave off |
| Callback URL | display-only (used by web flow) |

The dashboard does not require the Secret Key — the field is for the web OAuth flow. With native iOS, `expo-apple-authentication` returns a signed `identityToken` and Supabase verifies it directly via Apple's public keys. Hit **Save**.

> If you want web-based Sign in with Apple later you'd need to (a) create a Service ID under Identifiers, (b) create a Sign in with Apple key under Keys, (c) generate a JWT signed with the .p8 every 6 months and paste it as the Secret Key. We don't need any of that right now.

### Google

| Field | Value |
|---|---|
| Enable Sign in with Google | **on** |
| Client IDs (or "Authorized Client IDs") | `115969849864-377htlsrhd5un3stf5gmd3hcf220dcpo.apps.googleusercontent.com` (Web client ID) |
| Client Secret | Web client secret (from the Google Cloud JSON) |

The Supabase Google provider verifies id_tokens against the **Web** client ID. The iOS client ID never goes into Supabase — it lives in the app via `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.

## 4. Local prebuild

After `npm install`:

```sh
npx expo prebuild --clean --platform ios
```

This regenerates `ios/` with both auth plugins applied. The Google plugin in [app.json](../app.json) registers the URL scheme automatically — no manual Info.plist editing required.

```sh
npm run ios
```

## Sanity test

Once configured:

1. Launch the app on a real device (Apple sign-in does not work in the simulator).
2. Open Profile → Sign in.
3. Tap "Continue with Apple" — accept the prompt.
4. The app should land on Edit Profile with display name pre-filled.
5. Pick a username and save.
6. Repeat with a Google account on a separate physical device.

If sign-in fails, check:
- Supabase Auth logs (Dashboard → Authentication → Logs)
- Console output (`expo run:ios --device`) for native module errors
- That `.env` is loaded (run `npx expo start --clear` once after editing)

## Credentials inventory

| Credential | Where it lives | Sensitive? |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` (and bundle) | No |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable) | `.env` (and bundle) | No |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | `.env` (and bundle) | No |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `.env` (and bundle) | No |
| Google Web client **secret** | Supabase dashboard only | **Yes** |
| Apple Sign in with Apple .p8 (if web flow) | Supabase dashboard only | **Yes** |
| Supabase service role key | Edge functions only — never in app | **Yes** |
