/**
 * Foreground "logic pollen" particle field.
 *
 * Two layers in one Skia `<Canvas>`:
 *   1. Ambient pollen — a fixed pool of slowly drifting particles that
 *      give the world a sense of life. Each cycles its alpha + position
 *      via Reanimated `withRepeat` chains so the animation runs on the
 *      UI thread without per-frame React work.
 *   2. Burst groups — short-lived particle clusters spawned by the
 *      imperative `burstAt(x, y)` ref method when a level unlocks. Each
 *      burst is its own React component that mounts → animates →
 *      unmounts via TTL, so we never violate hooks rules with dynamic
 *      shared-value pools.
 *
 * Reduced motion ⇒ ambient pool collapses to 0 and bursts are smaller
 * + faster, so the cue still reads but the constant drift is gone.
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { colors } from '@/theme';

export interface ParticleFieldHandle {
  /** Spawn a small pollen burst at the given screen coordinate. Color
   *  defaults to the garden bloom green; pass an explicit color for
   *  per-event variety (e.g. gold for milestone unlocks). */
  burstAt: (x: number, y: number, color?: string) => void;
}

interface Props {
  width: number;
  height: number;
  /** Ambient pool size. Defaults to the World 1 budget (60). World 2 passes a
   *  cosmic preset count. Reduced motion overrides this to `reducedAmbientCount`. */
  ambientCount?: number;
  /** Ambient pool size under reduced motion. Defaults to 0 (no drift). */
  reducedAmbientCount?: number;
  /** Per-particle tint palette (cycled by seed). Defaults to the garden
   *  pollen palette. */
  palette?: string[];
  /** Default burst colour for `burstAt` when no explicit colour is passed. */
  burstColor?: string;
}

const AMBIENT_COUNT = 60;
const REDUCED_AMBIENT_COUNT = 0;
const BURST_PARTICLES = 14;
const BURST_DEFAULT_COLOR = colors.gardenBloom;
const DEFAULT_PALETTE = [colors.gardenCyanGlow, colors.gardenBloom, colors.gardenGold];

interface BurstEvent {
  id: number;
  x: number;
  y: number;
  color: string;
  spawnedAt: number;
}

/**
 * Single ambient particle. Owns three SharedValues that cycle
 * indefinitely — animation lives on the UI thread, React doesn't
 * re-render this component after the initial effect.
 */
function AmbientParticle({
  width,
  height,
  seed,
  palette,
}: {
  width: number;
  height: number;
  seed: number;
  palette: string[];
}) {
  const startX = useMemo(() => ((seed * 9301 + 49297) % 233280) / 233280, [seed]);
  const startY = useMemo(() => ((seed * 7919 + 104729) % 233280) / 233280, [seed]);
  const drift = useMemo(() => ((seed * 7) % 60) + 28, [seed]);
  const periodMs = useMemo(() => 5200 + ((seed * 113) % 4200), [seed]);
  const tint = useMemo(() => palette[seed % palette.length]!, [seed, palette]);

  const baseX = startX * width;
  const baseY = startY * height;

  const x = useSharedValue(baseX);
  const y = useSharedValue(baseY);
  const alpha = useSharedValue(0);

  useEffect(() => {
    x.value = baseX;
    y.value = baseY;
    alpha.value = 0;
    alpha.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: periodMs / 4, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: periodMs / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    y.value = withRepeat(
      withSequence(
        withTiming(baseY - drift, { duration: periodMs, easing: Easing.inOut(Easing.quad) }),
        withTiming(baseY, { duration: periodMs, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    x.value = withDelay(
      seed * 23,
      withRepeat(
        withSequence(
          withTiming(baseX + (seed % 2 === 0 ? 18 : -18), {
            duration: periodMs * 0.8,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(baseX, {
            duration: periodMs * 0.8,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(alpha);
    };
  }, [baseX, baseY, drift, periodMs, seed, x, y, alpha]);

  return <Circle cx={x} cy={y} r={1.6} color={tint} opacity={alpha} />;
}

/**
 * One burst event — `BURST_PARTICLES` particles fanning outward from a
 * center point, each fading + scaling to a target offset, then unmounted
 * by the parent on TTL. Using a fixed inner array of static React
 * elements keeps hooks usage at a stable count (one per particle slot).
 */
function BurstGroup({ event, reducedMotion }: { event: BurstEvent; reducedMotion: boolean }) {
  return (
    <>
      {Array.from({ length: BURST_PARTICLES }).map((_, i) => (
        <BurstParticle
          key={`${event.id}-${i}`}
          centerX={event.x}
          centerY={event.y}
          color={event.color}
          index={i}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  );
}

function BurstParticle({
  centerX,
  centerY,
  color,
  index,
  reducedMotion,
}: {
  centerX: number;
  centerY: number;
  color: string;
  index: number;
  reducedMotion: boolean;
}) {
  const x = useSharedValue(centerX);
  const y = useSharedValue(centerY);
  const alpha = useSharedValue(0);

  useEffect(() => {
    const ttlMs = reducedMotion ? 480 : 880;
    const reach = reducedMotion ? 28 : 60;
    const angle = (index / BURST_PARTICLES) * Math.PI * 2 + (index % 2 === 0 ? 0.12 : -0.12);
    const dist = reach * (0.7 + (index % 5) * 0.06);
    const targetX = centerX + Math.cos(angle) * dist;
    const targetY = centerY + Math.sin(angle) * dist;

    x.value = centerX;
    y.value = centerY;
    alpha.value = 0;

    x.value = withTiming(targetX, {
      duration: ttlMs,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    y.value = withTiming(targetY, {
      duration: ttlMs,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    alpha.value = withSequence(
      withTiming(1, { duration: ttlMs * 0.18, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: ttlMs * 0.82, easing: Easing.in(Easing.quad) }),
    );
    return () => {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(alpha);
    };
  }, [centerX, centerY, color, index, reducedMotion, x, y, alpha]);

  return <Circle cx={x} cy={y} r={3} color={color} opacity={alpha} />;
}

export const ParticleField = forwardRef<ParticleFieldHandle, Props>(function ParticleField(
  {
    width,
    height,
    ambientCount: ambientCountProp = AMBIENT_COUNT,
    reducedAmbientCount = REDUCED_AMBIENT_COUNT,
    palette = DEFAULT_PALETTE,
    burstColor = BURST_DEFAULT_COLOR,
  },
  ref,
) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const ambientCount = reducedMotion ? reducedAmbientCount : ambientCountProp;
  const ambientSeeds = useMemo(
    () => Array.from({ length: ambientCount }, (_, i) => i + 1),
    [ambientCount],
  );

  const idCounter = useRef(0);
  const [bursts, setBursts] = useState<BurstEvent[]>([]);

  const fireBurst = useCallback(
    (x: number, y: number, color: string = burstColor) => {
      const id = ++idCounter.current;
      const event: BurstEvent = { id, x, y, color, spawnedAt: Date.now() };
      setBursts((cur) => [...cur, event]);
      // TTL slightly longer than the inner timing so animations fully fade.
      const ttl = reducedMotion ? 600 : 1100;
      setTimeout(() => {
        setBursts((cur) => cur.filter((e) => e.id !== id));
      }, ttl);
    },
    [reducedMotion, burstColor],
  );

  useImperativeHandle(
    ref,
    () => ({
      burstAt: (x, y, color) => fireBurst(x, y, color ?? burstColor),
    }),
    [fireBurst, burstColor],
  );

  return (
    <View
      style={[styles.fill, { width, height }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas style={[styles.fill, { width, height }]}>
        {ambientSeeds.map((seed) => (
          <AmbientParticle
            key={`amb-${seed}`}
            seed={seed}
            width={width}
            height={height}
            palette={palette}
          />
        ))}
        {bursts.map((event) => (
          <BurstGroup key={`burst-${event.id}`} event={event} reducedMotion={reducedMotion} />
        ))}
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
