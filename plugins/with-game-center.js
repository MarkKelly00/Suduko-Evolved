// Expo config plugin: enable Apple Game Center for iOS builds.
//
// Adds the `com.apple.developer.game-center` entitlement to the app's
// `.entitlements` file at prebuild time. The entitlement is what tells
// Apple's provisioning system the app participates in Game Center, which
// in turn unlocks GameKit calls in the native bridge
// (modules/expo-game-center/ios/SudokuGameCenterModule.swift).
//
// Why a config plugin and not a direct edit to ios/<App>/<App>.entitlements:
//   - `expo prebuild --clean` regenerates the iOS folder from app.json +
//     plugins. Anything written directly into the regenerated tree is
//     blown away on the next clean.
//   - This plugin runs idempotently and safely on every prebuild, which
//     is what EAS Build does on its hosted runners.
//
// The match is also enforced server-side by Apple Developer:
// `com.sudokuevolved.app` must have the Game Center capability checked
// in the App Identifier configuration. If it isn't, the build will be
// signed but App Store submission will be rejected.
//
// Idempotent. Side-effect free apart from the .entitlements file.

const { withEntitlementsPlist } = require('@expo/config-plugins');

const GAME_CENTER_ENTITLEMENT_KEY = 'com.apple.developer.game-center';

module.exports = function withGameCenter(config) {
  return withEntitlementsPlist(config, (cfg) => {
    // Apple's entitlement value is a boolean — `true` enables Game Center.
    // Re-running the plugin overwrites the existing value, which is fine
    // because the only valid value is `true`.
    cfg.modResults[GAME_CENTER_ENTITLEMENT_KEY] = true;
    return cfg;
  });
};
