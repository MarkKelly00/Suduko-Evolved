/**
 * Mid-ground terrain blobs that anchor each cluster of level nodes.
 *
 * The blobs are radial-gradient circles drawn under the level nodes —
 * they read as soft "floating islands" lit from above. Each cluster
 * (~5 consecutive levels) gets its own large blob sized so the whole
 * cluster sits comfortably inside it. A darker undershadow circle is
 * offset down-and-right to fake a 3D form without any image asset.
 *
 * Layered behind the path + nodes; in front of the parallax backdrop.
 * Sits inside the scrolling content (no parallax of its own — terrain
 * scrolls 1:1 with the world, which is what makes the parallax sky
 * read as "background").
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/theme';
import {
  WORLD_1_NODE_LAYOUT,
  getWorldActForLevel,
  isActFinaleLevel,
  type MapNodeLayout,
} from './mapLayout';

interface Props {
  width: number;
  /** Viewport height — the Canvas itself stays within Metal's 8192 px
   *  texture limit. World content is panned via `scrollY`. */
  height: number;
  /** Live scroll offset; world content translates by -scrollY. */
  scrollY: SharedValue<number>;
}

/** Group nodes into clusters of `clusterSize` to anchor terrain blobs. */
const CLUSTER_SIZE = 5;

interface TerrainBlob {
  cx: number;
  cy: number;
  radius: number;
  rimRadius: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  tint: string;
  /** Act primary tint blended with biome tint — drives rim highlight. */
  actAccent: string;
  /** 0..1 — combined act intensity + cluster-position weighting. */
  intensity: number;
}

interface ActAura {
  cx: number;
  cy: number;
  radius: number;
  tint: string;
}

function clusterCenter(cluster: MapNodeLayout[], width: number): { x: number; y: number } {
  const xs = cluster.map((n) => n.x * width);
  const ys = cluster.map((n) => n.y);
  return {
    x: xs.reduce((a, b) => a + b, 0) / xs.length,
    y: ys.reduce((a, b) => a + b, 0) / ys.length,
  };
}

function clusterRadius(cluster: MapNodeLayout[], width: number): number {
  const center = clusterCenter(cluster, width);
  let maxDist = 0;
  for (const n of cluster) {
    const d = Math.hypot(n.x * width - center.x, n.y - center.y);
    if (d > maxDist) maxDist = d;
  }
  // Padding so the blob extends well past the outermost node in the cluster.
  return Math.max(220, maxDist + 140);
}

/** Pick a tint per biome for subtle visual variety. */
function tintForBiome(biome: MapNodeLayout['biome']): string {
  switch (biome) {
    case 'seed-gate':
      return 'rgba(91, 214, 168, 0.12)';
    case 'moon-vine':
      return 'rgba(126, 200, 220, 0.12)';
    case 'crystal-bed':
      return 'rgba(157, 123, 255, 0.10)';
    case 'logic-stream':
      return 'rgba(0, 229, 204, 0.10)';
    case 'bloom-arch':
      return 'rgba(245, 213, 138, 0.10)';
    case 'oracle-grove':
      return 'rgba(123, 167, 242, 0.10)';
  }
}

function buildTerrainBlobs(width: number): TerrainBlob[] {
  const blobs: TerrainBlob[] = [];
  for (let i = 0; i < WORLD_1_NODE_LAYOUT.length; i += CLUSTER_SIZE) {
    const cluster = WORLD_1_NODE_LAYOUT.slice(i, i + CLUSTER_SIZE);
    if (cluster.length === 0) continue;
    const c = clusterCenter(cluster, width);
    const baseRadius = clusterRadius(cluster, width);
    const dominant = cluster[Math.floor(cluster.length / 2)]!;
    const act = getWorldActForLevel(dominant.level);
    // Act intensity ramps blob size + opacity so later acts feel larger
    // and more luminous without overwhelming earlier zones. Scale curve
    // is gentle (0.92x → 1.16x) so the world still feels coherent.
    const intensityScale = 0.92 + act.intensity * 0.24;
    blobs.push({
      cx: c.x,
      cy: c.y,
      radius: baseRadius * intensityScale,
      rimRadius: baseRadius * 0.92 * intensityScale,
      shadowOffsetX: 14,
      shadowOffsetY: 22,
      tint: tintForBiome(dominant.biome),
      actAccent: act.accent,
      intensity: act.intensity,
    });
  }
  return blobs;
}

/** Build a small set of "act-finale" auras anchored on level 10/20/30 so
 *  each act ends with a destination that radiates further than a normal
 *  cluster blob. These render BEHIND the cluster blobs. */
function buildActAuras(width: number): ActAura[] {
  const auras: ActAura[] = [];
  for (const node of WORLD_1_NODE_LAYOUT) {
    if (!isActFinaleLevel(node.level)) continue;
    const act = getWorldActForLevel(node.level);
    auras.push({
      cx: node.x * width,
      cy: node.y,
      radius: 280 + act.intensity * 120,
      tint: act.wash,
    });
  }
  return auras;
}

export function GardenBackground({ width, height, scrollY }: Props) {
  const blobs = useMemo(() => buildTerrainBlobs(width), [width]);
  const auras = useMemo(() => buildActAuras(width), [width]);
  // World content translates by -scrollY so terrain stays anchored to
  // the same world-y coordinates as the level nodes (which scroll 1:1
  // inside the ScrollView).
  const transform = useDerivedValue(() => {
    'worklet';
    return [{ translateY: -scrollY.value }];
  }, [scrollY]);

  return (
    <View
      style={[styles.fill, { width, height }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas style={[styles.fill, { width, height }]}>
        <Group transform={transform}>
          {/* Act-finale auras — soft wide washes behind levels 10/20/30
              so each act visibly culminates in a destination. */}
          {auras.map((a, i) => (
            <Circle key={`aura-${i}`} cx={a.cx} cy={a.cy} r={a.radius} opacity={0.4}>
              <RadialGradient
                c={vec(a.cx, a.cy)}
                r={a.radius}
                colors={[a.tint, 'rgba(0,0,0,0)']}
              />
            </Circle>
          ))}
          {blobs.map((b, i) => (
            <React.Fragment key={`blob-${i}`}>
              {/* Underside shadow: same shape, dark fill, offset down-right.
                  Renders FIRST so the lit blob sits on top of it. */}
              <Circle
                cx={b.cx + b.shadowOffsetX}
                cy={b.cy + b.shadowOffsetY}
                r={b.radius}
                opacity={0.55}
              >
                <RadialGradient
                  c={vec(b.cx + b.shadowOffsetX, b.cy + b.shadowOffsetY)}
                  r={b.radius}
                  colors={[colors.gardenSkyDeep, 'rgba(7,11,23,0)']}
                />
              </Circle>
              {/* Lit blob — biome-tinted radial gradient. */}
              <Circle cx={b.cx} cy={b.cy} r={b.radius} opacity={0.85 + b.intensity * 0.15}>
                <RadialGradient
                  c={vec(b.cx - b.radius * 0.12, b.cy - b.radius * 0.16)}
                  r={b.radius}
                  colors={[b.tint, 'rgba(0,0,0,0)']}
                />
              </Circle>
              {/* Act-tinted rim — colour shifts per act so seed-grove
                  glows green, moonvine glows blue, oracle-temple glows
                  gold. Stronger in later acts. */}
              <Circle
                cx={b.cx}
                cy={b.cy - b.rimRadius * 0.05}
                r={b.rimRadius}
                opacity={0.14 + b.intensity * 0.12}
              >
                <RadialGradient
                  c={vec(b.cx, b.cy - b.rimRadius * 0.55)}
                  r={b.rimRadius}
                  colors={[b.actAccent, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)']}
                />
              </Circle>
            </React.Fragment>
          ))}
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
