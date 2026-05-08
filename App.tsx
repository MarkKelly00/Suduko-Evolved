// Root entry. The actual implementation lives at `src/app/App.tsx` so the
// project layout stays organized; `index.ts` continues to import this file
// because Expo's `registerRootComponent` expects ./App to be the root module.
//
// Side-effect imports must run BEFORE any other module that touches them.
// Order is intentional and load-bearing on iOS New Architecture:
//   1. react-native-url-polyfill — supabase-js uses URL/URLSearchParams,
//      which RN doesn't ship by default. Must run before any module that
//      might touch global URL.
//   2. react-native-gesture-handler — required first per RN Gesture Handler
//      docs so its native module patches install before any view tree mounts.
//   3. react-native-reanimated      — Reanimated 4 ships its runtime via
//      react-native-worklets; importing here ensures worklet plumbing is up
//      before any component using `useSharedValue` / `useAnimatedStyle`
//      evaluates (PremiumButton, CompletionOverlay, LevelNode, etc.).
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import 'react-native-reanimated';

export { default } from '@/app/App';
