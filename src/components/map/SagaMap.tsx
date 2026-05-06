/**
 * SagaMap — coordinator for the World 1 Logic Garden world.
 *
 * Owns:
 *   • the ScrollView + scrollY shared value (drives every parallax layer)
 *   • the unlock-event diff (visual-only; no store mutation) which feeds
 *     `LevelNode.isNewlyUnlocked` and `ParticleField.burstAt`
 *   • the "currently visible" layered render order of every world layer
 *
 * Z-order (back → front):
 *   1. `ParallaxBackdrop`    fixed Skia: gradient + neural grid + orbs +
 *                             vignette. Drives parallax from `scrollY`.
 *   2. `GardenBackground`    in-scroll Skia: soft terrain blobs under
 *                             each cluster of 3–5 nodes.
 *   3. `VineDecorations`     in-scroll Skia: curls + blossoms anchored
 *                             to path segments.
 *   4. `AnimatedLogicPath`   in-scroll Skia: the multi-stroke vine path
 *                             with completed/current/locked colouring +
 *                             traveling pulse on the current segment.
 *   5. `GardenLandmarks`     in-scroll Skia: procedural milestones at
 *                             levels 1, 5, 10, 15, 20, 25, 30.
 *   6. `LevelNode`s          in-scroll RN Pressables — the only tappable
 *                             surface. Pressing locked nodes still
 *                             shakes + warns via `hapticsService`.
 *   7. `ParticleField`       fixed-foreground Skia: ambient pollen +
 *                             unlock bursts via imperative ref.
 *   8. Back button           fixed top-left; remains keyboard/AT-friendly.
 *
 * Tap behavior, locked-shake, accessibility, and progress derivation are
 * preserved exactly from the prior `MapScreen` implementation.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LevelNode, type LevelNodeState } from '@/components/map/LevelNode';
import { ParallaxBackdrop } from '@/components/map/ParallaxBackdrop';
import { GardenBackground } from '@/components/map/GardenBackground';
import { AnimatedLogicPath } from '@/components/map/AnimatedLogicPath';
import { VineDecorations } from '@/components/map/VineDecorations';
import { GardenLandmarks } from '@/components/map/GardenLandmarks';
import {
  ParticleField,
  type ParticleFieldHandle,
} from '@/components/map/ParticleField';
import { WorldHeaderEmblem } from '@/components/map/WorldHeaderEmblem';
import { WORLD_1 } from '@/game/content/worlds';
import { WORLD_1_LEVELS, levelId as makeLevelId } from '@/game/content/levels';
import { useProgressStore } from '@/game/state/useProgressStore';
import { hapticsService } from '@/services/haptics/hapticsService';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import {
  MAP_CONTENT_HEIGHT,
  MAP_TOP_PADDING,
  WORLD_1_NODE_LAYOUT,
} from './mapLayout';

interface Props {
  onSelectLevel: (levelId: string) => void;
}

const NODE_SIZE = 64;

// `Animated.createAnimatedComponent` is the recommended way to make a
// ScrollView emit Reanimated-aware scroll events without a JS-thread
// hop per frame. Defined at module scope so the component identity is
// stable across renders.
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export function SagaMap({ onSelectLevel }: Props) {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Single shared value powering every parallax layer (backdrop now,
  // path/terrain/particles in later phases). Lives on the UI thread.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const unlockedLevels = useProgressStore((s) => s.unlockedLevels);
  const lastPlayedLevel = useProgressStore((s) => s.lastPlayedLevel);
  const levelEntries = useProgressStore((s) => s.levels);

  const layoutById = useMemo(() => {
    const map = new Map<string, (typeof WORLD_1_NODE_LAYOUT)[number]>();
    for (const n of WORLD_1_NODE_LAYOUT) {
      map.set(makeLevelId(n.level), n);
    }
    return map;
  }, []);

  const nodes = useMemo(() => {
    return WORLD_1_LEVELS.map((level) => {
      const completed = !!levelEntries[level.id];
      const unlocked = unlockedLevels.includes(level.id);
      let state: LevelNodeState = 'locked';
      if (completed) state = 'completed';
      else if (unlocked) state = 'unlocked';
      if (lastPlayedLevel === level.id && !completed) state = 'current';
      const layout = layoutById.get(level.id);
      return { level, state, layout };
    });
  }, [unlockedLevels, lastPlayedLevel, levelEntries, layoutById]);

  // Track "newly unlocked" levels purely for visual celebration. We diff
  // the unlocked list against a JS-side ref; nothing mutates the store.
  // Each entry self-clears after a generous TTL so subsequent re-renders
  // don't re-trigger the bloom.
  const prevUnlockedRef = useRef<string[]>(unlockedLevels);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const particleFieldRef = useRef<ParticleFieldHandle | null>(null);
  useEffect(() => {
    const prev = new Set(prevUnlockedRef.current);
    const newcomers = unlockedLevels.filter((id) => !prev.has(id));
    if (newcomers.length > 0) {
      setNewlyUnlocked((cur) => [...cur, ...newcomers]);
      // Fire a particle burst at each new node's screen position. We have
      // to translate the in-content y to a viewport-relative y by
      // subtracting the current scroll offset — which we can grab from
      // the shared value lazily.
      for (const id of newcomers) {
        const node = layoutById.get(id);
        if (!node) continue;
        const px = node.x * width;
        const py = node.y + MAP_TOP_PADDING - scrollY.value + insets.top;
        particleFieldRef.current?.burstAt(px, py);
      }
      const t = setTimeout(() => {
        setNewlyUnlocked((cur) => cur.filter((id) => !newcomers.includes(id)));
      }, 1500);
      prevUnlockedRef.current = unlockedLevels;
      return () => clearTimeout(t);
    }
    prevUnlockedRef.current = unlockedLevels;
    return undefined;
  }, [unlockedLevels, layoutById, width, scrollY, insets.top]);

  // Auto-scroll to the current node on first mount (non-animated jump
  // so the player resumes "where they left off" without a disorienting
  // fly-by). Skips if the current node is already in the first
  // viewport.
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    const target = nodes.find((n) => n.state === 'current') ?? nodes.find((n) => n.state === 'unlocked');
    if (!target?.layout) return;
    const targetY = target.layout.y;
    if (targetY > 600) {
      // Center the node in the viewport (subtract roughly half a screen).
      scrollRef.current?.scrollTo({ y: Math.max(0, targetY - 320), animated: false });
    }
    didInitialScrollRef.current = true;
  }, [nodes]);

  const handleBack = () => {
    hapticsService.selection();
    if (navigation.canGoBack()) navigation.goBack();
  };

  // Memoized progress predicates so we don't churn re-render keys on
  // every render of the world layers.
  const isCompletedLevel = React.useCallback(
    (level: number) => !!levelEntries[makeLevelId(level)],
    [levelEntries],
  );
  const isUnlockedLevel = React.useCallback(
    (level: number) => unlockedLevels.includes(makeLevelId(level)),
    [unlockedLevels],
  );
  const isCurrentLevel = React.useCallback(
    (level: number) =>
      lastPlayedLevel === makeLevelId(level) && !levelEntries[makeLevelId(level)],
    [lastPlayedLevel, levelEntries],
  );

  // The world stage stretches +insets.top so the header content slot
  // matches what the parallax backdrop sees as y=0.
  const stageTopPadding = insets.top;

  return (
    <View style={styles.root}>
      <ParallaxBackdrop width={width} height={height} scrollY={scrollY} />

      {/* World Skia layers — viewport-fixed Canvases that pan their
          contents by -scrollY. Sized to (width, height) so each Canvas
          stays inside Metal's 8192 px texture limit even though the
          virtual world is 8800+ px tall. They sit BEHIND the
          ScrollView so taps fall through to the level node Pressables
          inside it. */}
      <GardenBackground width={width} height={height} scrollY={scrollY} />
      <VineDecorations
        width={width}
        height={height}
        yOffset={MAP_TOP_PADDING + stageTopPadding}
        scrollY={scrollY}
        isCompleted={isCompletedLevel}
        isUnlocked={isUnlockedLevel}
      />
      <AnimatedLogicPath
        width={width}
        height={height}
        yOffset={MAP_TOP_PADDING + stageTopPadding}
        scrollY={scrollY}
        isCompleted={isCompletedLevel}
        isUnlocked={isUnlockedLevel}
        isCurrent={isCurrentLevel}
      />
      <GardenLandmarks
        width={width}
        height={height}
        yOffset={MAP_TOP_PADDING + stageTopPadding}
        scrollY={scrollY}
        isCompleted={isCompletedLevel}
        isUnlocked={isUnlockedLevel}
      />

      <AnimatedScrollView
        ref={scrollRef as React.Ref<Animated.ScrollView>}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            height: MAP_CONTENT_HEIGHT + stageTopPadding,
            paddingTop: stageTopPadding,
            paddingBottom: insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>WORLD 1</Text>
          <View style={styles.titleRow}>
            <WorldHeaderEmblem size={44} />
            <Text style={styles.worldName}>{WORLD_1.name}</Text>
          </View>
          <Text style={styles.worldTagline}>{WORLD_1.tagline}</Text>
        </View>

        {/* Lightweight stage view — only holds the level node
            Pressables. The Skia world layers live OUTSIDE the
            ScrollView (above) and pan via scrollY. */}
        <View style={[styles.stage, { width }]} pointerEvents="box-none">
          {nodes.map(({ level, state, layout }) => {
            if (!layout) return null;
            const stars = (levelEntries[level.id]?.stars ?? 0) as 0 | 1 | 2 | 3;
            const crown = !!levelEntries[level.id]?.crown;
            const px = layout.x * width;
            const py = layout.y;
            const isNewlyUnlocked = newlyUnlocked.includes(level.id);
            return (
              <View
                key={level.id}
                style={[
                  styles.nodePosition,
                  {
                    left: px - NODE_SIZE / 2,
                    top: py - NODE_SIZE / 2 + MAP_TOP_PADDING,
                  },
                ]}
                pointerEvents="box-none"
              >
                <LevelNode
                  index={level.index}
                  state={state}
                  stars={stars}
                  crown={crown}
                  isNewlyUnlocked={isNewlyUnlocked}
                  variant={layout.landmark ? 'milestone' : 'default'}
                  onPress={() => onSelectLevel(level.id)}
                  size={NODE_SIZE}
                />
              </View>
            );
          })}
        </View>
      </AnimatedScrollView>

      <ParticleField ref={particleFieldRef} width={width} height={height} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={handleBack}
        style={[styles.backButton, { top: insets.top + spacing.sm }]}
        hitSlop={12}
      >
        <Text style={styles.backIcon}>{'‹'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  headerBlock: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  worldName: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  worldTagline: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  stage: {
    position: 'relative',
    flex: 1,
  },
  nodePosition: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
  },
  backButton: {
    position: 'absolute',
    left: spacing.base,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    marginTop: -2,
  },
});
