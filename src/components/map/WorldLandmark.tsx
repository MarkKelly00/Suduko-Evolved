/**
 * World 2 (Astral Nexus) landmarks — high-fidelity Grok Imagine sprites.
 *
 * The seven cosmic set-pieces (Nexus Gate, Prism Bridge, Meridian Orrery,
 * Starfall Archive, Parallax Sanctum, Logic Astrolabe, Astral Core) are premium
 * painted sprites generated on pure black with alpha baked from luminance, so
 * they composite cleanly over the starfield. Rendered large + animated as
 * ambient background set-pieces behind the path by the shared `LandmarkSprites`.
 *
 * Regenerate the art with: `node scripts/generate-world2-vfx.mjs`.
 */
import React from 'react';
import { useImage, type SkImage } from '@shopify/react-native-skia';
import { type SharedValue } from 'react-native-reanimated';
import type { MapLandmark, MapNodeLayout, WorldAct } from './mapLayout';
import { isWorld2ActFinaleLevel } from './world2Layout';
import { LandmarkSprites } from './LandmarkSprites';

interface Props {
  width: number;
  height: number;
  yOffset: number;
  scrollY: SharedValue<number>;
  isCompleted: (level: number) => boolean;
  isUnlocked: (level: number) => boolean;
  /** Globalized World 2 layout (y already in combined scroll space). */
  layout: readonly MapNodeLayout[];
  actForLevel: (level: number) => WorldAct;
}

const SPRITES: Partial<Record<MapLandmark, ReturnType<typeof require>>> = {
  'Nexus Gate': require('../../../assets/map/world2/nexus_gate.png'),
  'Prism Bridge': require('../../../assets/map/world2/prism_bridge.png'),
  'Meridian Orrery': require('../../../assets/map/world2/meridian_orrery.png'),
  'Starfall Archive': require('../../../assets/map/world2/starfall_archive.png'),
  'Parallax Sanctum': require('../../../assets/map/world2/parallax_sanctum.png'),
  'Logic Astrolabe': require('../../../assets/map/world2/logic_astrolabe.png'),
  'Astral Core': require('../../../assets/map/world2/astral_core.png'),
};

const ROTATING = new Set<MapLandmark>([
  'Nexus Gate',
  'Meridian Orrery',
  'Parallax Sanctum',
  'Logic Astrolabe',
  'Astral Core',
]);

export function WorldLandmark(props: Props) {
  // Fixed-count sprite loaders (hooks can't live in a loop).
  const imgNexusGate = useImage(SPRITES['Nexus Gate']);
  const imgPrismBridge = useImage(SPRITES['Prism Bridge']);
  const imgOrrery = useImage(SPRITES['Meridian Orrery']);
  const imgArchive = useImage(SPRITES['Starfall Archive']);
  const imgSanctum = useImage(SPRITES['Parallax Sanctum']);
  const imgAstrolabe = useImage(SPRITES['Logic Astrolabe']);
  const imgCore = useImage(SPRITES['Astral Core']);
  const byName: Partial<Record<MapLandmark, SkImage | null>> = {
    'Nexus Gate': imgNexusGate,
    'Prism Bridge': imgPrismBridge,
    'Meridian Orrery': imgOrrery,
    'Starfall Archive': imgArchive,
    'Parallax Sanctum': imgSanctum,
    'Logic Astrolabe': imgAstrolabe,
    'Astral Core': imgCore,
  };

  return (
    <LandmarkSprites
      {...props}
      spriteFor={(name) => byName[name] ?? null}
      rotating={ROTATING}
      isFinale={isWorld2ActFinaleLevel}
      keyPrefix="w2"
    />
  );
}
