/**
 * SagaMap — coordinator for the multi-world saga journey (Logic Garden +
 * Astral Nexus) rendered as ONE continuous vertical scroll.
 *
 * Owns:
 *   • the ScrollView + scrollY shared value (drives every parallax layer)
 *   • the unlock-event diff (visual-only; no store mutation) which feeds
 *     `LevelNode.isNewlyUnlocked` and `ParticleField.burstAt`
 *   • the level-30-complete diff that energizes the World 2 unlock portal
 *   • the "currently visible" layered render order of every world layer
 *
 * Continuous-world model: nodes/acts/themes come from `worldRegistry`, which
 * places World 2 below World 1 with a portal gap. World 2 renders its OWN
 * instances of the path / biome backdrop / landmarks / particle layers (with
 * the cosmic theme), so the path visibly BREAKS at the gap — a new destination,
 * not a continuation of the same rail. All of it is gated by
 * `featureFlags.enableAstralNexus`: when off, the combined model collapses to
 * exactly World 1 and the map renders byte-identical to before.
 *
 * Z-order (back → front):
 *   1. ParallaxBackdrop (with scroll-driven W1→W2 atmosphere cross-fade)
 *   2. GardenBackground (W1) / WorldBiomeBackdrop (W2)
 *   3. VineDecorations (W1)
 *   4. AnimatedLogicPath ×2 (W1 + W2, themed; path breaks at the gap)
 *   5. GardenLandmarks (W1) / WorldLandmark (W2)
 *   6. BiomeTransitionGate (W1)
 *   7. ScrollView: world headers, WorldUnlockPortal, WorldHeaderCard, LevelNodes
 *   8. ParticleField ×(1–2): W1 pollen + bursts, W2 cosmic motes
 *   9. Back button + ActProgressHeader + LevelPreviewModal
 *
 * Tap behavior (node → preview modal, never auto-launch), locked-shake,
 * accessibility, reduced motion, and 60fps scroll are preserved.
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
import { GardenLandmark } from '@/components/map/GardenLandmark';
import { BiomeTransitionGate } from '@/components/map/BiomeTransitionGate';
import { ActProgressHeader } from '@/components/map/ActProgressHeader';
import { LevelPreviewModal } from '@/components/map/LevelPreviewModal';
import { WorldBiomeBackdrop } from '@/components/map/WorldBiomeBackdrop';
import { WorldLandmark } from '@/components/map/WorldLandmark';
import { WorldUnlockPortal } from '@/components/map/WorldUnlockPortal';
import { WorldHeaderCard } from '@/components/map/WorldHeaderCard';
import { RivalMarker } from '@/components/map/RivalMarker';
import {
  ParticleField,
  type ParticleFieldHandle,
} from '@/components/map/ParticleField';
import { WorldHeaderEmblem } from '@/components/map/WorldHeaderEmblem';
import { WORLD_1 } from '@/game/content/worlds';
import { levelIdForGlobal } from '@/game/content/levels';
import { useProgressStore } from '@/game/state/useProgressStore';
import { featureFlags } from '@/game/config/featureFlags';
import { useAuthGate } from '@/components/auth/AuthGate';
import type { RootStackNavigation } from '@/app/navigation/routes';
import { hapticsService } from '@/services/haptics/hapticsService';
import type { LevelPreview } from '@/services/levels/levelPreviewService';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import { MAP_TOP_PADDING, WORLD_1_NODE_LAYOUT, WORLD_1_ACTS, getWorldActForLevel } from './mapLayout';
import { WORLD_1_THEME, WORLD_2_THEME } from './worldThemes';
import { WORLD_2_ACTS, getWorld2ActForLevel } from './world2Layout';
import {
  buildCombinedNodes,
  combinedContentHeight,
  getGlobalizedLayout,
  isAstralNexusInPlay,
  portalAnchorY,
  worldHeaderAnchorY,
  world2EntryY,
} from './worldRegistry';

interface Props {
  onSelectLevel: (levelId: string) => void;
}

const NODE_SIZE = 64;
const PORTAL_ART_H = 210;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export function SagaMap({ onSelectLevel }: Props) {
  const navigation = useNavigation();
  const stackNav = useNavigation<RootStackNavigation>();
  const requireAuth = useAuthGate();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // The in-scroll world header pushes the node `stage` down by its own height.
  // The fixed Skia overlays (path / landmarks / terrain / gates) pan from y=0,
  // so they must add this height to their yOffset to land on the node CENTERS.
  // Measured via onLayout; seeded with a typical value to avoid a first-frame
  // jump. (Default ≈ eyebrow + display title + tagline + vertical padding.)
  const [headerHeight, setHeaderHeight] = useState(132);

  const astralNexusEnabled = isAstralNexusInPlay();

  // Modal state: the GLOBAL level number (1–60) whose preview is open, or null.
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const unlockedLevels = useProgressStore((s) => s.unlockedLevels);
  const lastPlayedLevel = useProgressStore((s) => s.lastPlayedLevel);
  const levelEntries = useProgressStore((s) => s.levels);

  // Combined node list across enabled worlds (World 1 only when the flag is
  // off). Each node carries its global level, level id, and global-y.
  const combined = useMemo(() => buildCombinedNodes(), []);
  const combinedById = useMemo(() => {
    const map = new Map<string, (typeof combined)[number]>();
    for (const n of combined) map.set(n.levelId, n);
    return map;
  }, [combined]);

  const nodes = useMemo(() => {
    return combined.map((node) => {
      const completed = !!levelEntries[node.levelId];
      const unlocked = unlockedLevels.includes(node.levelId);
      let state: LevelNodeState = 'locked';
      if (completed) state = 'completed';
      else if (unlocked) state = 'unlocked';
      if (lastPlayedLevel === node.levelId && !completed) state = 'current';
      return { node, state };
    });
  }, [combined, unlockedLevels, lastPlayedLevel, levelEntries]);

  // World 2 globalized layout for its Skia layers (y in combined space).
  const world2Layout = useMemo(() => getGlobalizedLayout('world2'), []);

  // Unified, world-aware progress predicates. `levelIdForGlobal` maps 1..30 →
  // world1, 31..60 → world2, so the SAME predicates drive both worlds' layers.
  const isCompletedLevel = React.useCallback(
    (level: number) => !!levelEntries[levelIdForGlobal(level)],
    [levelEntries],
  );
  const isUnlockedLevel = React.useCallback(
    (level: number) => unlockedLevels.includes(levelIdForGlobal(level)),
    [unlockedLevels],
  );
  const isCurrentLevel = React.useCallback(
    (level: number) =>
      lastPlayedLevel === levelIdForGlobal(level) && !levelEntries[levelIdForGlobal(level)],
    [lastPlayedLevel, levelEntries],
  );

  // Newly-unlocked visual celebration (diffed against a JS ref).
  const prevUnlockedRef = useRef<string[]>(unlockedLevels);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const particleFieldRef = useRef<ParticleFieldHandle | null>(null);
  useEffect(() => {
    const prev = new Set(prevUnlockedRef.current);
    const newcomers = unlockedLevels.filter((id) => !prev.has(id));
    if (newcomers.length > 0) {
      setNewlyUnlocked((cur) => [...cur, ...newcomers]);
      for (const id of newcomers) {
        const node = combinedById.get(id);
        if (!node) continue;
        const px = node.x * width;
        const py = node.globalY + MAP_TOP_PADDING + insets.top + headerHeight - scrollY.value;
        // World 2 bursts glow with the act accent; World 1 keeps its default.
        particleFieldRef.current?.burstAt(
          px,
          py,
          node.worldNumber === 2 ? node.act.accent : undefined,
        );
      }
      const t = setTimeout(() => {
        setNewlyUnlocked((cur) => cur.filter((id) => !newcomers.includes(id)));
      }, 1500);
      prevUnlockedRef.current = unlockedLevels;
      return () => clearTimeout(t);
    }
    prevUnlockedRef.current = unlockedLevels;
    return undefined;
  }, [unlockedLevels, combinedById, width, scrollY, insets.top, headerHeight]);

  // Portal activation: when world1-level-30 flips to completed, energize the
  // World 2 unlock portal once (one-shot, like the unlock bloom).
  const world30Complete = !!levelEntries['world1-level-30'];
  const prevWorld30Ref = useRef(world30Complete);
  const [portalJustActivated, setPortalJustActivated] = useState(false);
  useEffect(() => {
    if (world30Complete && !prevWorld30Ref.current) {
      setPortalJustActivated(true);
      const t = setTimeout(() => setPortalJustActivated(false), 2200);
      prevWorld30Ref.current = world30Complete;
      return () => clearTimeout(t);
    }
    prevWorld30Ref.current = world30Complete;
    return undefined;
  }, [world30Complete]);

  // Auto-scroll to the current node on first mount (non-animated).
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    const target =
      nodes.find((n) => n.state === 'current') ?? nodes.find((n) => n.state === 'unlocked');
    if (!target) return;
    const targetY = target.node.globalY;
    if (targetY > 600) {
      scrollRef.current?.scrollTo({ y: Math.max(0, targetY - 320), animated: false });
    }
    didInitialScrollRef.current = true;
  }, [nodes]);

  const handleBack = () => {
    hapticsService.selection();
    if (navigation.canGoBack()) navigation.goBack();
  };

  const scrollToWorld2 = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, worldHeaderAnchorY() - 140), animated: true });
  };

  // ─── LevelPreviewModal CTAs ───────────────────────────────────────────────
  const handlePlayLevel = (globalLevel: number) => {
    onSelectLevel(levelIdForGlobal(globalLevel));
  };

  const handleChallengeFriend = (preview: LevelPreview) => {
    if (!preview.yourBest) {
      setPreviewLevel(null);
      setTimeout(() => {
        if (__DEV__) {
          console.warn('[SagaMap] Challenge requires a cleared run; suggest playing first.');
        }
      }, 80);
      return;
    }
    requireAuth(
      () => {
        const yb = preview.yourBest!;
        setPreviewLevel(null);
        setTimeout(() => {
          stackNav.navigate('FriendPicker', {
            mode: 'campaign',
            levelId: preview.levelId,
            puzzleSeed: '',
            challengerAttempt: {
              score: yb.score,
              timeSeconds: Math.round(yb.timeMs / 1000),
              mistakes: yb.mistakes ?? 0,
              hints: yb.hints ?? 0,
              stars: (yb.stars === 0 ? 1 : yb.stars) as 1 | 2 | 3,
              crown: yb.crown,
            },
          });
        }, 80);
      },
      { contextSubtitle: 'Sign in to challenge a friend on this level.' },
    );
  };

  const handleViewLeaderboard = (preview: LevelPreview) => {
    setPreviewLevel(null);
    setTimeout(() => {
      stackNav.navigate('Leaderboard', {
        mode: 'campaign-level',
        levelId: preview.levelId,
        scope: 'global',
      });
    }, 80);
  };

  const stageTopPadding = insets.top;
  // Include the header height so the Skia path/landmark overlays align with the
  // node centers (which live inside the header-pushed `stage`).
  const layerYOffset = MAP_TOP_PADDING + stageTopPadding + headerHeight;
  const contentHeight = combinedContentHeight();

  // Cosmic accent for World 2 nodes' "unlocked/available" state.
  const world2UnlockedAccent = useMemo(
    () => ({
      border: WORLD_2_THEME.nodeUnlockedBorder,
      glow: WORLD_2_THEME.nodeUnlockedGlow,
      halo: WORLD_2_THEME.nodeUnlockedHalo,
      text: WORLD_2_THEME.nodeUnlockedText,
    }),
    [],
  );

  return (
    <View style={styles.root}>
      <ParallaxBackdrop
        width={width}
        height={height}
        scrollY={scrollY}
        world2={
          astralNexusEnabled
            ? {
                startY: portalAnchorY() - height * 0.7,
                endY: world2EntryY() + 120,
                theme: WORLD_2_THEME,
              }
            : undefined
        }
      />

      {/* World 1 Skia layers. Landmarks render BEHIND the path (ambient
          high-fidelity garden background set-pieces the path travels through),
          matching World 2's treatment. */}
      <GardenBackground width={width} height={height} scrollY={scrollY} />
      <GardenLandmark
        width={width}
        height={height}
        yOffset={layerYOffset}
        scrollY={scrollY}
        isCompleted={isCompletedLevel}
        isUnlocked={isUnlockedLevel}
        layout={WORLD_1_NODE_LAYOUT}
        actForLevel={getWorldActForLevel}
      />
      <VineDecorations
        width={width}
        height={height}
        yOffset={layerYOffset}
        scrollY={scrollY}
        isCompleted={isCompletedLevel}
        isUnlocked={isUnlockedLevel}
      />
      <AnimatedLogicPath
        width={width}
        height={height}
        yOffset={layerYOffset}
        scrollY={scrollY}
        isCompleted={isCompletedLevel}
        isUnlocked={isUnlockedLevel}
        isCurrent={isCurrentLevel}
        layout={WORLD_1_NODE_LAYOUT}
        acts={WORLD_1_ACTS}
        actForLevel={getWorldActForLevel}
        theme={WORLD_1_THEME}
      />
      <BiomeTransitionGate
        width={width}
        height={height}
        yOffset={layerYOffset}
        scrollY={scrollY}
        isCompleted={isCompletedLevel}
        isUnlocked={isUnlockedLevel}
      />

      {/* World 2 Skia layers — only when Astral Nexus is enabled. Landmarks
          render BEHIND the path (ambient background set-pieces the path travels
          through). Separate AnimatedLogicPath instance ⇒ the path breaks at the
          portal gap. */}
      {astralNexusEnabled ? (
        <>
          <WorldBiomeBackdrop
            width={width}
            height={height}
            yOffset={layerYOffset}
            scrollY={scrollY}
            layout={world2Layout}
            acts={WORLD_2_ACTS}
            theme={WORLD_2_THEME}
            actForLevel={getWorld2ActForLevel}
          />
          <WorldLandmark
            width={width}
            height={height}
            yOffset={layerYOffset}
            scrollY={scrollY}
            isCompleted={isCompletedLevel}
            isUnlocked={isUnlockedLevel}
            layout={world2Layout}
            actForLevel={getWorld2ActForLevel}
          />
          <AnimatedLogicPath
            width={width}
            height={height}
            yOffset={layerYOffset}
            scrollY={scrollY}
            isCompleted={isCompletedLevel}
            isUnlocked={isUnlockedLevel}
            isCurrent={isCurrentLevel}
            layout={world2Layout}
            acts={WORLD_2_ACTS}
            actForLevel={getWorld2ActForLevel}
            theme={WORLD_2_THEME}
          />
        </>
      ) : null}

      <AnimatedScrollView
        ref={scrollRef as React.Ref<Animated.ScrollView>}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            height: contentHeight + stageTopPadding,
            paddingTop: stageTopPadding,
            paddingBottom: insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <View
          style={styles.headerBlock}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - headerHeight) > 1) setHeaderHeight(h);
          }}
        >
          <Text style={styles.eyebrow}>WORLD 1</Text>
          <View style={styles.titleRow}>
            <WorldHeaderEmblem size={44} />
            <Text style={styles.worldName}>{WORLD_1.name}</Text>
          </View>
          <Text style={styles.worldTagline}>{WORLD_1.tagline}</Text>
        </View>

        <View style={[styles.stage, { width }]} pointerEvents="box-none">
          {/* World 2 unlock portal + header card live in the portal gap. */}
          {astralNexusEnabled ? (
            <>
              <View
                style={[styles.portalSlot, { top: portalAnchorY() + MAP_TOP_PADDING - PORTAL_ART_H / 2 }]}
                pointerEvents="box-none"
              >
                <WorldUnlockPortal
                  width={width}
                  active={world30Complete}
                  justActivated={portalJustActivated}
                  animationEnabled={featureFlags.enableWorld2PortalAnimation}
                  theme={WORLD_2_THEME}
                  onEnter={scrollToWorld2}
                />
              </View>
              <View
                style={[styles.headerCardSlot, { top: worldHeaderAnchorY() + MAP_TOP_PADDING }]}
                pointerEvents="box-none"
              >
                <WorldHeaderCard
                  width={width}
                  unlocked={world30Complete}
                  onBeginLevel31={() => setPreviewLevel(31)}
                />
              </View>
            </>
          ) : null}

          {nodes.map(({ node, state }) => {
            const stars = (levelEntries[node.levelId]?.stars ?? 0) as 0 | 1 | 2 | 3;
            const crown = !!levelEntries[node.levelId]?.crown;
            const px = node.x * width;
            const py = node.globalY;
            const isNewlyUnlocked = newlyUnlocked.includes(node.levelId);
            const isWorld2 = node.worldNumber === 2;
            return (
              <View
                key={node.levelId}
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
                  index={node.globalLevel}
                  state={state}
                  stars={stars}
                  crown={crown}
                  isNewlyUnlocked={isNewlyUnlocked}
                  variant={node.landmark ? 'milestone' : 'default'}
                  onPress={() => setPreviewLevel(node.globalLevel)}
                  size={NODE_SIZE}
                  unlockedAccent={isWorld2 ? world2UnlockedAccent : undefined}
                  accessibilityContext={`World ${node.worldNumber}, ${node.act.title}`}
                />
                {featureFlags.enableMapRivalMarkers && state !== 'locked' ? (
                  <RivalMarker levelId={node.levelId} nodeSize={NODE_SIZE} />
                ) : null}
              </View>
            );
          })}
        </View>
      </AnimatedScrollView>

      {/* World 1 ambient pollen + unlock bursts. */}
      <ParticleField ref={particleFieldRef} width={width} height={height} />
      {/* World 2 cosmic motes (separate pool, cosmic palette). */}
      {astralNexusEnabled ? (
        <ParticleField
          width={width}
          height={height}
          ambientCount={80}
          reducedAmbientCount={0}
          palette={WORLD_2_THEME.particlePalette}
          burstColor={WORLD_2_THEME.accent}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={handleBack}
        style={[styles.backButton, { top: insets.top + spacing.sm }]}
        hitSlop={12}
      >
        <Text style={styles.backIcon}>{'‹'}</Text>
      </Pressable>

      <ActProgressHeader scrollY={scrollY} bottom={insets.bottom + spacing.sm} />

      <LevelPreviewModal
        levelIndex={previewLevel}
        onClose={() => setPreviewLevel(null)}
        onPlay={handlePlayLevel}
        onChallengeFriend={handleChallengeFriend}
        onViewLeaderboard={handleViewLeaderboard}
      />
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
  portalSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerCardSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
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
