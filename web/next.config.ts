import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  // Silence the multi-lockfile workspace-root warning. The repo root has the
  // Expo project's lockfile; this scopes Next.js trace output to /web only.
  outputFileTracingRoot: path.join(__dirname),
  typedRoutes: true,
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
};

export default config;
