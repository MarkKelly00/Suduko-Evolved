/**
 * Premium dark elegant palette for Sudoku Evolved.
 * Deep navy base, warm gold accents, no cheap neon.
 */
export const colors = {
  // Base
  bg: '#0B1220',
  bgGradientTop: '#0E1628',
  bgGradientBottom: '#080D18',
  surface: '#121A2A',
  surfaceElevated: '#1A2440',
  surfacePressed: '#0F1727',
  divider: '#1F2A44',

  // Accents
  accentGold: '#E0B96A',
  accentGoldGlow: '#F5D58A',
  accentGoldDim: '#9C7E40',
  accentBlue: '#7BA7F2',
  accentTeal: '#5EE7C4',
  accentPurple: '#9D7BFF',

  // Status
  success: '#5BD6A8',
  successGlow: '#86F0C5',
  mistake: '#E5484D',
  mistakeGlow: '#FF7B7E',
  warning: '#F6C85F',

  // Text
  text: '#ECEFF7',
  textMuted: '#8892AB',
  textDim: '#5A6582',
  textOnGold: '#0B1220',

  // Board
  boardLine: '#2A3550',
  boardLineBold: '#4A5878',
  boardBg: '#0E1626',

  // Cell states (overlays — apply on top of boardBg)
  cellGiven: '#ECEFF7',
  cellUserValue: '#E0B96A',
  cellSelected: 'rgba(224, 185, 106, 0.18)',
  cellHighlighted: 'rgba(224, 185, 106, 0.08)',
  cellSameNumber: 'rgba(91, 214, 168, 0.12)',
  /** Transient: cells in the same row/col/box that share a value with the
   *  most recent placement. Stronger red so the rule violation reads first. */
  cellConflict: 'rgba(229, 72, 77, 0.28)',
  /** Persistent: cells whose current value disagrees with the unique
   *  solution. Subtler than conflict so the player can still read the
   *  board cleanly while scanning to fix it. */
  cellMistakeBg: 'rgba(229, 72, 77, 0.10)',
  cellHint: 'rgba(157, 123, 255, 0.18)',
  cellNoteText: '#8892AB',

  // Map (legacy ribbon-style tokens — preserved for any remaining callers)
  pathLocked: '#2A3550',
  pathUnlocked: '#4A5878',
  pathCurrent: '#E0B96A',
  pathCompleted: '#5BD6A8',
  nodeLocked: '#1A2440',
  nodeUnlocked: '#1F2A44',
  nodeCurrent: '#E0B96A',
  nodeCompleted: '#5BD6A8',

  // Map / Garden — World 1 Logic Garden palette. Drives every layer of
  // the SagaMap world. Designed to sit cohesively next to the existing
  // accent gold / accent teal so the saga map and the gameplay VFX feel
  // like the same product.
  gardenSky: '#0A0F1E',
  gardenSkyDeep: '#070B17',
  gardenNavySecondary: '#101A33',
  gardenCyan: '#00E5CC',
  gardenCyanGlow: '#5EE7C4',
  gardenBloom: '#58F2B6',
  gardenGold: '#E0B96A',
  gardenGoldGlow: '#F5D58A',
  gardenFog: 'rgba(180, 210, 255, 0.08)',
  gardenNodeDormant: '#27304A',
  gardenNodeFrost: 'rgba(180, 210, 255, 0.06)',
  gardenGridLine: 'rgba(126, 200, 220, 0.05)',
  gardenOrb: 'rgba(91, 214, 168, 0.10)',
  gardenVignette: 'rgba(7, 11, 23, 0.7)',
  gardenPathOuterGlow: 'rgba(0, 229, 204, 0.18)',
  gardenPathMid: 'rgba(0, 229, 204, 0.55)',
  gardenPathCore: '#F5D58A',
  gardenPathLocked: 'rgba(74, 88, 120, 0.45)',
  gardenPathCompleted: 'rgba(91, 214, 168, 0.7)',

  // Misc
  scrim: 'rgba(0, 0, 0, 0.6)',
  glassFill: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
} as const;

export type ColorToken = keyof typeof colors;
