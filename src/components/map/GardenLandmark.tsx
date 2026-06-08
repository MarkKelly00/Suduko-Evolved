/**
 * World 1 (Logic Garden) landmarks — high-fidelity Grok Imagine sprites.
 *
 * The seven botanical set-pieces (Seed Gate, Glass Sprout Bridge, Crystal Logic
 * Fountain, Moonvine Crossing, Golden Ratio Grove, Oracle Bloom, Logic Garden
 * Temple) are premium painted sprites in the Logic Garden palette (teal / green
 * / gold), generated on pure black with alpha baked from luminance. Rendered
 * large + animated as ambient background set-pieces behind the path by the
 * shared `LandmarkSprites` — the botanical counterpart to `WorldLandmark`.
 *
 * Regenerate the art with: `node scripts/generate-world1-vfx.mjs`.
 */
import React from 'react';
import { useImage, type SkImage } from '@shopify/react-native-skia';
import { type SharedValue } from 'react-native-reanimated';
import {
  isActFinaleLevel,
  type MapLandmark,
  type MapNodeLayout,
  type WorldAct,
} from './mapLayout';
import { LandmarkSprites } from './LandmarkSprites';

interface Props {
  width: number;
  height: number;
  yOffset: number;
  scrollY: SharedValue<number>;
  isCompleted: (level: number) => boolean;
  isUnlocked: (level: number) => boolean;
  /** World 1 layout (y already in combined scroll space; origin 0). */
  layout: readonly MapNodeLayout[];
  actForLevel: (level: number) => WorldAct;
}

const SPRITES: Partial<Record<MapLandmark, ReturnType<typeof require>>> = {
  'Seed Gate': require('../../../assets/map/world1/seed_gate.png'),
  'Glass Sprout Bridge': require('../../../assets/map/world1/glass_sprout_bridge.png'),
  'Crystal Logic Fountain': require('../../../assets/map/world1/crystal_logic_fountain.png'),
  'Moonvine Crossing': require('../../../assets/map/world1/moonvine_crossing.png'),
  'Golden Ratio Grove': require('../../../assets/map/world1/golden_ratio_grove.png'),
  'Oracle Bloom': require('../../../assets/map/world1/oracle_bloom.png'),
  'Logic Garden Temple': require('../../../assets/map/world1/logic_garden_temple.png'),
};

// Radial set-pieces slowly rotate; the rest just breathe.
const ROTATING = new Set<MapLandmark>([
  'Crystal Logic Fountain',
  'Golden Ratio Grove',
  'Oracle Bloom',
]);

export function GardenLandmark(props: Props) {
  // Fixed-count sprite loaders (hooks can't live in a loop).
  const imgSeedGate = useImage(SPRITES['Seed Gate']);
  const imgBridge = useImage(SPRITES['Glass Sprout Bridge']);
  const imgFountain = useImage(SPRITES['Crystal Logic Fountain']);
  const imgMoonvine = useImage(SPRITES['Moonvine Crossing']);
  const imgGrove = useImage(SPRITES['Golden Ratio Grove']);
  const imgBloom = useImage(SPRITES['Oracle Bloom']);
  const imgTemple = useImage(SPRITES['Logic Garden Temple']);
  const byName: Partial<Record<MapLandmark, SkImage | null>> = {
    'Seed Gate': imgSeedGate,
    'Glass Sprout Bridge': imgBridge,
    'Crystal Logic Fountain': imgFountain,
    'Moonvine Crossing': imgMoonvine,
    'Golden Ratio Grove': imgGrove,
    'Oracle Bloom': imgBloom,
    'Logic Garden Temple': imgTemple,
  };

  return (
    <LandmarkSprites
      {...props}
      spriteFor={(name) => byName[name] ?? null}
      rotating={ROTATING}
      isFinale={isActFinaleLevel}
      keyPrefix="w1"
    />
  );
}
