import type { MetadataRoute } from 'next';
import { PRODUCT_NAME, TAGLINE } from '@/lib/brand/copy';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_NAME,
    short_name: PRODUCT_NAME,
    description: TAGLINE,
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1220',
    theme_color: '#0B1220',
    icons: [
      // Standard PWA icon pair. 192 is the installed-app icon size; 512 is
      // used for splash + high-density displays. Both flattened opaque on
      // navy so Android doesn't render transparent corners as a system-color
      // frame on the home screen.
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
