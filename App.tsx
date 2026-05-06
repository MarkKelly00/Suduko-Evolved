// Root entry. The actual implementation lives at `src/app/App.tsx` so the
// project layout stays organized; `index.ts` continues to import this file
// because Expo's `registerRootComponent` expects ./App to be the root module.
//
// Import gesture handler at the top of the entry as the docs require.
import 'react-native-gesture-handler';

export { default } from '@/app/App';
