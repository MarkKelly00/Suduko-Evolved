/**
 * Jest restricts to pure-TypeScript layers (no React Native imports) so the
 * suite stays fast and doesn't need native-module mocks. Add new pure modules
 * to the testMatch list as they land.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: [
    '<rootDir>/src/game/engine/**/*.test.ts',
    '<rootDir>/src/game/modes/**/*.test.ts',
    '<rootDir>/src/game/sync/**/*.test.ts',
    '<rootDir>/src/services/persistence/**/*.test.ts',
    '<rootDir>/src/services/supabase/__tests__/username.test.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/.*))',
  ],
  collectCoverageFrom: [
    'src/game/engine/**/*.ts',
    'src/game/sync/**/*.ts',
    'src/services/persistence/**/*.ts',
    'src/services/supabase/utils/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
  ],
};
