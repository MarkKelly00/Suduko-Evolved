/**
 * TypeScript mirror of /src/theme/colors.ts (the iOS app's canonical palette).
 * Use these for inline style props, framer-motion values, OG image generation.
 * Otherwise prefer Tailwind utilities (bg-bg, text-gold, etc.) backed by
 * tokens.css.
 */
export const colors = {
  // Base
  bg: '#0B1220',
  bgTop: '#0E1628',
  bgBottom: '#080D18',
  surface: '#121A2A',
  surfaceElevated: '#1A2440',
  surfacePressed: '#0F1727',
  divider: '#1F2A44',

  // Accents
  gold: '#E0B96A',
  goldGlow: '#F5D58A',
  goldDim: '#9C7E40',
  blue: '#7BA7F2',
  teal: '#5EE7C4',
  purple: '#9D7BFF',

  // Status
  success: '#5BD6A8',
  successGlow: '#86F0C5',
  mistake: '#E5484D',
  warning: '#F6C85F',

  // Text
  text: '#ECEFF7',
  textMuted: '#8892AB',
  textDim: '#5A6582',
  textOnGold: '#0B1220',

  // Logic Garden
  gardenSky: '#0A0F1E',
  gardenSkyDeep: '#070B17',
  gardenCyan: '#00E5CC',
  gardenCyanGlow: '#5EE7C4',
  gardenBloom: '#58F2B6',
  gardenGold: '#E0B96A',
  gardenGoldGlow: '#F5D58A',
  gardenNodeDormant: '#27304A',
  gardenPathCore: '#F5D58A',
  gardenPathCompleted: 'rgba(91, 214, 168, 0.7)',

  // Glass
  glassFill: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
} as const;

export type ColorToken = keyof typeof colors;
