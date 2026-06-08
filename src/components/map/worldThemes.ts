/**
 * Per-world visual themes for the saga map.
 *
 * Every map layer (path, terrain backdrop, particles, backdrop atmosphere,
 * nodes) reads its colours from a `WorldTheme` rather than hard-coding tokens,
 * so a second world can render the same geometry in a completely different
 * palette. `WORLD_1_THEME` maps 1:1 onto the existing `colors.garden*` tokens
 * so World 1 renders byte-identical to before the expansion; `WORLD_2_THEME`
 * supplies the Astral Nexus cosmic palette (violet / prism blue / starlight
 * cyan / gold core over a colder navy).
 */

import { colors } from '@/theme';

export type ParticlePreset =
  | 'garden_pollen'
  | 'moonvine_mist'
  | 'oracle_gold'
  | 'prism_shards'
  | 'star_motes'
  | 'orbital_gold';

export interface WorldTheme {
  id: string;
  worldId: string;
  /** Backdrop radial-gradient stops (top/center → deep edge). */
  backgroundGradientTop: string;
  backgroundGradientBottom: string;
  /** Primary + accent + glow used for headers, emblems, landmark tints. */
  primary: string;
  accent: string;
  glow: string;
  /** Path strokes (back → front): halo, body, bright core, completed, locked. */
  pathOuterGlow: string;
  pathMid: string;
  pathCore: string;
  pathCompleted: string;
  pathLocked: string;
  /** Node state accents — World 2 tints the "unlocked/available" node violet
   *  while keeping the universal gold "current" + green "completed" cues. */
  nodeUnlockedBorder: string;
  nodeUnlockedGlow: string;
  nodeUnlockedHalo: string;
  nodeUnlockedText: string;
  nodeDormant: string;
  nodeFrost: string;
  /** Backdrop grid + vignette + ambient orb tints (atmosphere). */
  gridLine: string;
  vignette: string;
  orbTints: string[];
  /** Soft terrain wash colour behind node clusters. */
  terrainWash: string;
  /** Ambient particle palette + preset name. */
  particlePalette: string[];
  particlePreset: ParticlePreset;
  /** Landmark halo / glow accent. */
  landmarkGlow: string;
  /** 0..1 multipliers for overall effect strength. */
  shaderIntensity: number;
  vignetteStrength: number;
}

/** World 1 — Logic Garden. Values mirror the existing `colors.garden*` tokens
 *  exactly so the live map is unchanged when it reads through the theme. */
export const WORLD_1_THEME: WorldTheme = {
  id: 'theme-logic-garden',
  worldId: 'world1',
  backgroundGradientTop: colors.gardenSky,
  backgroundGradientBottom: colors.gardenSkyDeep,
  primary: colors.gardenCyan,
  accent: colors.gardenCyanGlow,
  glow: colors.gardenBloom,
  pathOuterGlow: colors.gardenPathOuterGlow,
  pathMid: colors.gardenPathMid,
  pathCore: colors.gardenPathCore,
  pathCompleted: colors.gardenPathCompleted,
  pathLocked: colors.gardenPathLocked,
  nodeUnlockedBorder: colors.gardenCyanGlow,
  nodeUnlockedGlow: 'rgba(0,229,204,0.45)',
  nodeUnlockedHalo: 'rgba(0,229,204,0.18)',
  nodeUnlockedText: colors.gardenCyanGlow,
  nodeDormant: colors.gardenNodeDormant,
  nodeFrost: colors.gardenNodeFrost,
  gridLine: colors.gardenGridLine,
  vignette: colors.gardenVignette,
  orbTints: [
    colors.gardenBloom,
    colors.gardenCyan,
    colors.gardenCyanGlow,
    colors.gardenBloom,
    colors.gardenGold,
    colors.gardenCyan,
    colors.gardenGoldGlow,
    colors.gardenBloom,
  ],
  terrainWash: 'rgba(91,214,168,0.10)',
  particlePalette: [colors.gardenCyanGlow, colors.gardenBloom, colors.gardenGold],
  particlePreset: 'garden_pollen',
  landmarkGlow: colors.gardenCyanGlow,
  shaderIntensity: 0.85,
  vignetteStrength: 1,
};

/** World 2 — Astral Nexus. Cosmic palette, distinct from the garden but
 *  sharing the warm gold path core so the two worlds feel related. */
export const WORLD_2_THEME: WorldTheme = {
  id: 'theme-astral-nexus',
  worldId: 'world2',
  backgroundGradientTop: colors.astralSky,
  backgroundGradientBottom: colors.astralSkyDeep,
  primary: colors.astralViolet,
  accent: colors.astralBlue,
  glow: colors.astralTeal,
  pathOuterGlow: colors.astralPathOuterGlow,
  pathMid: colors.astralPathMid,
  pathCore: colors.astralPathCore,
  pathCompleted: colors.astralPathCompleted,
  pathLocked: colors.astralPathLocked,
  nodeUnlockedBorder: colors.astralVioletGlow,
  nodeUnlockedGlow: 'rgba(157,123,255,0.48)',
  nodeUnlockedHalo: 'rgba(157,123,255,0.20)',
  nodeUnlockedText: colors.astralVioletGlow,
  nodeDormant: colors.astralNodeDormant,
  nodeFrost: colors.astralNodeFrost,
  gridLine: colors.astralGridLine,
  vignette: colors.astralVignette,
  orbTints: [
    colors.astralViolet,
    colors.astralBlue,
    colors.astralStarlight,
    colors.astralViolet,
    colors.astralGold,
    colors.astralTeal,
    colors.astralGoldGlow,
    colors.astralStarlight,
  ],
  terrainWash: 'rgba(157,123,255,0.10)',
  particlePalette: [
    colors.astralVioletGlow,
    colors.astralBlue,
    colors.astralStarlight,
    colors.astralTeal,
    colors.astralGoldGlow,
  ],
  particlePreset: 'star_motes',
  landmarkGlow: colors.astralTeal,
  shaderIntensity: 1,
  vignetteStrength: 1.05,
};

export const WORLD_THEMES: Record<string, WorldTheme> = {
  world1: WORLD_1_THEME,
  world2: WORLD_2_THEME,
};

export function getWorldTheme(worldId: string): WorldTheme {
  return WORLD_THEMES[worldId] ?? WORLD_1_THEME;
}
