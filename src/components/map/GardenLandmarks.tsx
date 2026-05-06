/**
 * Procedural Skia milestone decorations near landmark levels.
 *
 * Each landmark is a small structure (~120 px wide) anchored next to its
 * level node, drawn as a couple of geometric primitives so the world
 * feels like a *place* rather than a generic level list. No image
 * assets, no shaders — pure paths + circles + rects with gradients.
 *
 * Visual brief per landmark name (kept tasteful, premium, dark-elegant):
 *   • Seed Gate              — twin pillars + a soft arch.
 *   • Glass Sprout Bridge    — two arched lines crossing the path.
 *   • Crystal Logic Fountain — concentric rings + a droplet up-top.
 *   • Moonvine Crossing      — an X of vines with a glow at center.
 *   • Golden Ratio Grove     — a single golden spiral arc.
 *   • Oracle Bloom           — an octagonal flower silhouette.
 *   • Logic Garden Temple    — small temple roof + columns silhouette.
 *
 * Landmarks render BEHIND the level nodes (so the node sits on top of
 * its monument) but IN FRONT of the path — calling them out as
 * structures the path travels through.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Rect,
  Skia,
  vec,
  type SkPath,
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
  type MapLandmark,
  type MapNodeLayout,
} from './mapLayout';

interface Props {
  width: number;
  height: number;
  yOffset: number;
  scrollY: SharedValue<number>;
  isCompleted: (level: number) => boolean;
  isUnlocked: (level: number) => boolean;
}

interface LandmarkSpec {
  level: number;
  name: MapLandmark;
  cx: number;
  cy: number;
  /** 1.0 = base size; act-finale levels (10/20/30) get a larger value
   *  so they read as the chapter's signature destination. */
  scale: number;
  /** Premium tinted halo radius for act-finale landmarks. 0 disables. */
  haloRadius: number;
}

function buildLandmarks(layout: readonly MapNodeLayout[], width: number): LandmarkSpec[] {
  return layout
    .filter((n): n is MapNodeLayout & { landmark: MapLandmark } => n.landmark != null)
    .map((n) => {
      const finale = isActFinaleLevel(n.level);
      const act = getWorldActForLevel(n.level);
      // Final acts grow more confidently. Level 30 ends up the largest
      // because the latest act has intensity 1.0.
      const scale = finale ? 1.25 + act.intensity * 0.25 : 1;
      const haloRadius = finale ? 110 + act.intensity * 60 : 0;
      return {
        level: n.level,
        name: n.landmark,
        cx: n.x * width,
        // Sit landmarks slightly above their node so the node still
        // reads as the primary affordance.
        cy: n.y - 18,
        scale,
        haloRadius,
      };
    });
}

function pathFromCommands(commands: (string | number)[]): SkPath {
  const path = Skia.Path.Make();
  let i = 0;
  while (i < commands.length) {
    const op = commands[i++] as string;
    switch (op) {
      case 'M':
        path.moveTo(commands[i++] as number, commands[i++] as number);
        break;
      case 'L':
        path.lineTo(commands[i++] as number, commands[i++] as number);
        break;
      case 'Q':
        path.quadTo(
          commands[i++] as number,
          commands[i++] as number,
          commands[i++] as number,
          commands[i++] as number,
        );
        break;
      case 'C':
        path.cubicTo(
          commands[i++] as number,
          commands[i++] as number,
          commands[i++] as number,
          commands[i++] as number,
          commands[i++] as number,
          commands[i++] as number,
        );
        break;
      case 'Z':
        path.close();
        break;
    }
  }
  return path;
}

interface RenderArgs {
  cx: number;
  cy: number;
  yOffset: number;
  active: boolean;
  glow: string;
  body: string;
  outline: string;
}

function SeedGate({ cx, cy, yOffset, active, body, glow }: RenderArgs) {
  const baseY = cy + yOffset + 50;
  const topY = cy + yOffset - 26;
  const w = 80;
  return (
    <>
      {active ? (
        <Circle cx={cx} cy={(baseY + topY) / 2} r={56} opacity={0.18}>
          <RadialGradient
            c={vec(cx, (baseY + topY) / 2)}
            r={56}
            colors={[glow, 'rgba(0,0,0,0)']}
          />
        </Circle>
      ) : null}
      <Rect x={cx - w / 2} y={topY} width={6} height={baseY - topY} color={body} opacity={0.85} />
      <Rect x={cx + w / 2 - 6} y={topY} width={6} height={baseY - topY} color={body} opacity={0.85} />
      <Path
        path={pathFromCommands(['M', cx - w / 2, topY, 'Q', cx, topY - 26, cx + w / 2, topY, 'Z'])}
        color={body}
        opacity={0.55}
      />
    </>
  );
}

function GlassSproutBridge({ cx, cy, yOffset, body, glow, active }: RenderArgs) {
  const y = cy + yOffset + 18;
  return (
    <>
      <Path
        path={pathFromCommands(['M', cx - 80, y, 'Q', cx - 30, y - 36, cx + 20, y])}
        style="stroke"
        strokeWidth={2}
        color={body}
        opacity={0.85}
      />
      <Path
        path={pathFromCommands(['M', cx - 20, y, 'Q', cx + 30, y - 36, cx + 80, y])}
        style="stroke"
        strokeWidth={2}
        color={body}
        opacity={0.85}
      />
      {active ? (
        <Circle cx={cx} cy={y - 30} r={6} color={glow} opacity={0.95} />
      ) : null}
    </>
  );
}

function CrystalLogicFountain({ cx, cy, yOffset, body, glow, active }: RenderArgs) {
  const center = { x: cx, y: cy + yOffset };
  return (
    <>
      {active ? (
        <Circle cx={center.x} cy={center.y} r={70} opacity={0.2}>
          <RadialGradient
            c={vec(center.x, center.y)}
            r={70}
            colors={[glow, 'rgba(0,0,0,0)']}
          />
        </Circle>
      ) : null}
      {[58, 42, 26].map((r, i) => (
        <Circle
          key={i}
          cx={center.x}
          cy={center.y}
          r={r}
          style="stroke"
          strokeWidth={1.5}
          color={body}
          opacity={active ? 0.7 - i * 0.18 : 0.35 - i * 0.1}
        />
      ))}
      {/* Droplet on top */}
      <Path
        path={pathFromCommands([
          'M', center.x, center.y - 70,
          'Q', center.x + 6, center.y - 60, center.x, center.y - 50,
          'Q', center.x - 6, center.y - 60, center.x, center.y - 70,
          'Z',
        ])}
        color={glow}
        opacity={active ? 0.9 : 0.4}
      />
    </>
  );
}

function MoonvineCrossing({ cx, cy, yOffset, body, glow, active }: RenderArgs) {
  const y = cy + yOffset;
  return (
    <>
      <Path
        path={pathFromCommands(['M', cx - 70, y - 42, 'Q', cx, y, cx + 70, y + 42])}
        style="stroke"
        strokeWidth={2}
        color={body}
        opacity={0.8}
      />
      <Path
        path={pathFromCommands(['M', cx - 70, y + 42, 'Q', cx, y, cx + 70, y - 42])}
        style="stroke"
        strokeWidth={2}
        color={body}
        opacity={0.8}
      />
      {active ? (
        <Circle cx={cx} cy={y} r={8} color={glow} opacity={0.9} />
      ) : null}
    </>
  );
}

function GoldenRatioGrove({ cx, cy, yOffset, body, glow, active }: RenderArgs) {
  // Approximate a golden spiral with 3 quadrant arcs scaled by phi.
  const phi = 1.61803;
  let r = 64;
  const cmds: (string | number)[] = [];
  let curX = cx;
  let curY = cy + yOffset;
  cmds.push('M', curX, curY);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const nx = curX + Math.cos(angle) * r;
    const ny = curY + Math.sin(angle) * r;
    cmds.push('Q', curX + Math.cos(angle - 0.4) * r * 1.1, curY + Math.sin(angle - 0.4) * r * 1.1, nx, ny);
    curX = nx;
    curY = ny;
    r /= phi;
  }
  return (
    <>
      <Path
        path={pathFromCommands(cmds)}
        style="stroke"
        strokeWidth={2}
        color={active ? glow : body}
        opacity={active ? 0.9 : 0.45}
      />
    </>
  );
}

function OracleBloom({ cx, cy, yOffset, body, glow, active }: RenderArgs) {
  const center = { x: cx, y: cy + yOffset };
  const petals: (string | number)[] = [];
  const petalCount = 8;
  const petalLen = 38;
  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    const tipX = center.x + Math.cos(a) * petalLen;
    const tipY = center.y + Math.sin(a) * petalLen;
    const c1X = center.x + Math.cos(a - 0.18) * petalLen * 0.6;
    const c1Y = center.y + Math.sin(a - 0.18) * petalLen * 0.6;
    const c2X = center.x + Math.cos(a + 0.18) * petalLen * 0.6;
    const c2Y = center.y + Math.sin(a + 0.18) * petalLen * 0.6;
    petals.push('M', center.x, center.y, 'Q', c1X, c1Y, tipX, tipY, 'Q', c2X, c2Y, center.x, center.y);
  }
  return (
    <>
      {active ? (
        <Circle cx={center.x} cy={center.y} r={petalLen} opacity={0.22}>
          <RadialGradient
            c={vec(center.x, center.y)}
            r={petalLen}
            colors={[glow, 'rgba(0,0,0,0)']}
          />
        </Circle>
      ) : null}
      <Path
        path={pathFromCommands(petals)}
        style="stroke"
        strokeWidth={1.4}
        color={body}
        opacity={0.85}
      />
      <Circle cx={center.x} cy={center.y} r={6} color={glow} opacity={active ? 1 : 0.45} />
    </>
  );
}

function LogicGardenTemple({ cx, cy, yOffset, body, glow, active }: RenderArgs) {
  const baseY = cy + yOffset + 60;
  const roofY = cy + yOffset - 6;
  const w = 110;
  return (
    <>
      {active ? (
        <Circle cx={cx} cy={(baseY + roofY) / 2} r={90} opacity={0.22}>
          <RadialGradient
            c={vec(cx, (baseY + roofY) / 2)}
            r={90}
            colors={[glow, 'rgba(0,0,0,0)']}
          />
        </Circle>
      ) : null}
      {/* Roof — triangle */}
      <Path
        path={pathFromCommands([
          'M', cx - w / 2, roofY,
          'L', cx, roofY - 36,
          'L', cx + w / 2, roofY,
          'Z',
        ])}
        color={body}
        opacity={0.65}
      />
      {/* Columns — three vertical bars */}
      {[-1, 0, 1].map((i) => {
        const x = cx + i * (w / 3);
        return (
          <Rect
            key={i}
            x={x - 4}
            y={roofY + 4}
            width={8}
            height={baseY - roofY - 4}
            color={body}
            opacity={0.85}
          />
        );
      })}
      {/* Plinth */}
      <Rect x={cx - w / 2 - 6} y={baseY} width={w + 12} height={6} color={body} opacity={0.8} />
    </>
  );
}

function renderLandmark(spec: LandmarkSpec, args: RenderArgs) {
  switch (spec.name) {
    case 'Seed Gate':
      return <SeedGate {...args} />;
    case 'Glass Sprout Bridge':
      return <GlassSproutBridge {...args} />;
    case 'Crystal Logic Fountain':
      return <CrystalLogicFountain {...args} />;
    case 'Moonvine Crossing':
      return <MoonvineCrossing {...args} />;
    case 'Golden Ratio Grove':
      return <GoldenRatioGrove {...args} />;
    case 'Oracle Bloom':
      return <OracleBloom {...args} />;
    case 'Logic Garden Temple':
      return <LogicGardenTemple {...args} />;
  }
}

export function GardenLandmarks({
  width,
  height,
  yOffset,
  scrollY,
  isCompleted,
  isUnlocked,
}: Props) {
  const landmarks = useMemo(
    () => buildLandmarks(WORLD_1_NODE_LAYOUT, width),
    [width],
  );

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
          {landmarks.map((spec) => {
            const completed = isCompleted(spec.level);
            const unlocked = isUnlocked(spec.level);
            const active = completed || unlocked;
            const act = getWorldActForLevel(spec.level);
            // Wrap each landmark in a <Group> scaled around its anchor
            // so act-finale milestones (10/20/30) are visibly larger
            // than the smaller in-act landmarks. Origin = the landmark's
            // anchor in world coords.
            const groupOrigin = vec(spec.cx, spec.cy + yOffset);
            const groupTransform = [{ scale: spec.scale }];
            // Body / glow shift to the act's accent so each chapter's
            // landmarks read in that chapter's colour story. Locked
            // landmarks always stay desaturated.
            const args: RenderArgs = {
              cx: spec.cx,
              cy: spec.cy,
              yOffset,
              active,
              glow: completed ? act.accent : act.primary,
              body: active ? act.primary : colors.gardenPathLocked,
              outline: act.accent,
            };
            return (
              <Group
                key={`landmark-${spec.level}`}
                origin={groupOrigin}
                transform={groupTransform}
              >
                {/* Act-finale halo — soft wide wash so 10/20/30 read as
                    destinations from a long scroll away. */}
                {spec.haloRadius > 0 && active ? (
                  <Circle
                    cx={spec.cx}
                    cy={spec.cy + yOffset}
                    r={spec.haloRadius}
                    opacity={completed ? 0.35 : 0.18}
                  >
                    <RadialGradient
                      c={vec(spec.cx, spec.cy + yOffset)}
                      r={spec.haloRadius}
                      colors={[act.accent, 'rgba(0,0,0,0)']}
                    />
                  </Circle>
                ) : null}
                {renderLandmark(spec, args)}
              </Group>
            );
          })}
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
