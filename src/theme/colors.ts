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
  cellConflict: 'rgba(229, 72, 77, 0.22)',
  cellHint: 'rgba(157, 123, 255, 0.18)',
  cellNoteText: '#8892AB',

  // Map
  pathLocked: '#2A3550',
  pathUnlocked: '#4A5878',
  pathCurrent: '#E0B96A',
  pathCompleted: '#5BD6A8',
  nodeLocked: '#1A2440',
  nodeUnlocked: '#1F2A44',
  nodeCurrent: '#E0B96A',
  nodeCompleted: '#5BD6A8',

  // Misc
  scrim: 'rgba(0, 0, 0, 0.6)',
  glassFill: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
} as const;

export type ColorToken = keyof typeof colors;
