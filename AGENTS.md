# AGENTS.md

## Learned User Preferences

- Prefers production-ready / App Store-bound fixes over quick hacks; explicitly chooses the longer path when offered a shortcut vs. a robust option.
- Drives debugging by pasting terminal logs and expects deep-dive root-cause analysis tied to specific log lines, not symptom-only mitigation.
- Wants authoritative primary docs (Supabase, Expo, React Native, Apple, Google) cited before code changes; defer to Context7/Shopify MCP routing rules over guesswork.
- Expects explicit instrumentation (per-step `console.warn` / dev logs) added when diagnosing flows that previously failed silently.
- Tests iOS builds on the iPhone 17 Pro Max Simulator.
- When the agent needs Metro running, the user expects it to be started for them (`npm run start`) before further iOS Simulator debugging.
- Will paste secrets/env values directly in chat when needed and expects them written to the gitignored `.env` at repo root, mirroring `.env.example` structure.

## Learned Workspace Facts

- Stack: Expo SDK ~54.0.33, React Native 0.81.5, React 19.1.0, Hermes; iOS workspace at `ios/SudokuEvolved.xcworkspace`; native iOS uses `AppDelegate.swift` with bundle root `.expo/.virtual-metro-entry`. Expo Router root is `src/app`.
- Build/run scripts: `npm run start` (`expo start --dev-client`), `npm run ios` (`expo run:ios`), `npm run prebuild` / `npm run prebuild:ios`, `npm run typecheck`, `npm run lint`, `npm test`.
- Debug iOS builds require Metro running on `localhost:8081`; otherwise the simulator shows the "No script URL provided" redbox. Start Metro with `npm run start` before any Xcode Debug run.
- Required env contract in gitignored `.env` at repo root: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. When any are missing, `src/services/supabase/env.ts` warns and `AuthScreen` falls back to "Auth is not configured yet — running as guest."
- Native iOS Apple/Google Sign-In must bypass `supabase.auth.signInWithIdToken`: its internal fetch hangs on the iOS Simulator. Use a direct `fetch` to `${SUPABASE_URL}/auth/v1/token?grant_type=id_token` then `supabase.auth.setSession({ access_token, refresh_token })`. Pattern lives in `src/services/supabase/authService.ts`.
- Apple Sign-In flow: generate a raw nonce, send the SHA-256 hash to Apple, send the raw nonce to Supabase so the symmetric nonce check passes.
- `@react-native-google-signin/google-signin` v14 (Original SDK) auto-generates a nonce inside the Google id_token and never exposes it to JS; custom-nonce support exists only in the paid Universal/One Tap module (not installed). To make native iOS Google Sign-In work with Supabase: enable "Skip nonce check" in Supabase Dashboard → Authentication → Providers → Google, and do not send a `nonce` field in the token-exchange body.
- Supabase Dashboard's Google provider exposes only one Client ID field (the Web client ID). The iOS client ID is configured app-side via `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and passed to `GoogleSignin.configure({ iosClientId, webClientId })`.
- Warning-suppression config plugin: `plugins/with-pod-warnings.js` patches both Pods (Podfile `post_install`) and the app target's `OTHER_SWIFT_FLAGS` with `-Xcc -Wno-nullability-completeness -Xcc -Wno-incomplete-umbrella` while preserving existing flags such as `-D EXPO_CONFIGURATION_DEBUG`.
- After editing config plugins or `app.json` native sections, regenerate with `expo prebuild` and clean Xcode Build Folder plus DerivedData (including `ModuleCache.noindex`) — Clang module cache survives a plain Clean Build Folder and will keep showing stale warnings otherwise.
- Empty dSYM warnings on Debug Simulator builds are expected (Hermes/JSC stripped) and not a launch blocker; investigate runtime config (Metro, env, AppDelegate) instead.
- Auth code lives in `src/services/supabase/authService.ts`; Supabase env loader in `src/services/supabase/env.ts`. Keep instrumentation as `[Apple] …` / `[Google] …` `console.warn` lines and never log raw token contents (length / status only).
