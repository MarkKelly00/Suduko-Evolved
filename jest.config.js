/**
 * Phase 2/3 of MVP runs Jest only on the pure-TypeScript engine and persistence
 * layer (no React Native imports). We use `ts-jest`-style transformation via
 * the `jest-expo` preset, restricted to `src/game/engine/**` and
 * `src/services/persistence/**` to keep the suite fast and free of
 * native-module mocking until later phases add component tests.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: [
    '<rootDir>/src/game/engine/**/*.test.ts',
    '<rootDir>/src/services/persistence/**/*.test.ts',
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
    'src/services/persistence/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
  ],
};
