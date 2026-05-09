/**
 * Canonical Sudoku Evolved copy. Single source of truth so the homepage,
 * OG images, and other surfaces stay in sync.
 *
 * Strings sourced from the iOS app where applicable
 * (HomeScreen.tsx, worlds.ts, ResultsScreen.tsx, EffectsLayer.tsx,
 * timeTrial.ts) — quoted verbatim.
 */
export const PRODUCT_NAME = 'Sudoku Evolved';
export const TAGLINE = 'Pure logic. Cinematic feel.';
export const HERO_BODY =
  'A premium mobile Sudoku experience with saga-map progression, cinematic completion VFX, Time Trials, online duels, friends, crowns, and Logic Garden worlds.';

export const META_DESCRIPTION =
  'A premium mobile Sudoku game with cinematic VFX, Logic Garden saga progression, Time Trials, online duels, friends, leaderboards, stars, crowns, and Perfect Bloom finishes.';

export const LAST_UPDATED = '2026-05-07';

export const FEATURES = [
  {
    title: 'Pure Sudoku Rules',
    body: 'No gimmicks. The rules you know — refined, weighted, and honored.',
  },
  {
    title: 'Cinematic VFX',
    body: 'Row sweeps, box bursts, and a Perfect Bloom finish that feels earned.',
  },
  {
    title: 'Saga Map Progression',
    body: 'Logic Garden worlds open one landmark at a time. Stars and crowns mark the way.',
  },
  {
    title: 'Online Duels',
    body: 'Find a rival solving the same grid in real time.',
  },
] as const;

/** World 1 — confirmed in src/game/content/worlds.ts and GardenLandmarks.tsx. */
export const LOGIC_GARDEN = {
  name: 'Logic Garden',
  worldTagline: 'Where reason blooms.',
  acts: ['Seed Grove', 'Moonvine Stream', 'Oracle Bloom Temple'] as const,
  landmarks: [
    'Seed Gate',
    'Glass Sprout Bridge',
    'Crystal Logic Fountain',
    'Moonvine Crossing',
    'Golden Ratio Grove',
    'Oracle Bloom',
    'Logic Garden Temple',
  ] as const,
} as const;

/** Achievement strings — confirmed in src/components/effects/EffectsLayer.tsx. */
export const ACHIEVEMENTS = {
  logicBloom: 'Logic Bloom',
  perfectBloom: 'Perfect Bloom',
  perfectHarmony: 'Perfect Harmony',
  logicCascade: 'Logic Cascade',
  tripleFlow: 'Triple Flow',
} as const;

export const TIME_TRIALS = {
  sectionTitle: 'Race the clock — solo, head-to-head, or against a friend.',
  modes: [
    {
      title: '3-Minute Sprint',
      body: 'Pure speed. As many fills as you can land before the timer runs out.',
    },
    {
      title: 'Quick Duel',
      body: 'Get matched with a stranger on the same seed. Cleanest solve wins.',
    },
    {
      title: 'Challenge a Friend',
      body: 'Send a duel link. Same grid. Real-time progress.',
    },
    {
      title: 'Invite Link',
      body: 'Share a link from anywhere. Anyone with it can race you.',
    },
  ] as const,
} as const;

export const FRIENDS_LEADERBOARD = {
  title: 'Climb the board. Prove the cleanest solve.',
  body: 'Challenge a friend, watch their progress in real time, and keep your seat at the top.',
} as const;

export const PRIVACY_TRUST = {
  title: 'Play your way.',
  bullets: [
    'Guest play, no account required.',
    'Sign in with Apple or Google to sync, friend, and climb leaderboards.',
    'No ads. No clutter. No interruptions.',
  ] as const,
} as const;

export const FINAL_CTA = {
  title: 'Ready for a Perfect Bloom?',
  body: 'Download Sudoku Evolved and find your first Logic Bloom.',
} as const;

export const SUPPORT_EMAIL = 'support@sudokuevolved.com';
