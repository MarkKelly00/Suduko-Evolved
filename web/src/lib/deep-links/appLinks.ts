/**
 * Android Digital Asset Links payload (assetlinks.json).
 *
 * The package is the same as the iOS bundle since Expo prebuilds both.
 *
 * The SHA256 fingerprint MUST be replaced with the production Play Console
 * cert before Android App Links will register. See
 * /docs/website-deployment.md for the replacement procedure.
 */

const PACKAGE_NAME = 'com.sudokuevolved.app';
const PRODUCTION_SHA256 = 'REPLACE_ME_WITH_PRODUCTION_SHA256';

export const assetLinksPayload = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: PACKAGE_NAME,
      sha256_cert_fingerprints: [PRODUCTION_SHA256],
    },
  },
] as const;
