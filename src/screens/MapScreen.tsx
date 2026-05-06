import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { LevelNode, type LevelNodeState } from '@/components/map/LevelNode';
import { WORLD_1_LEVELS } from '@/game/content/levels';
import { WORLD_1 } from '@/game/content/worlds';
import { useProgressStore } from '@/game/state/useProgressStore';
import { campaign } from '@/game/modes/campaign';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type { RootStackNavigation } from '@/app/navigation/routes';

interface NodeLayout {
  /** Approximate horizontal offset so nodes weave a path (-1..1). */
  swing: number;
  /** Vertical gap to the previous node. */
  gap: number;
}

/**
 * Static "ribbon" layout for Phase 3. Nodes swing gently left and right as
 * you scroll, simulating a curved path. Phase 4 will draw an actual Skia
 * spline through these positions and add ambient particles.
 */
function layoutFor(index: number): NodeLayout {
  const swing = Math.sin((index * Math.PI) / 4) * 0.7;
  const gap = 96;
  return { swing, gap };
}

function MapScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const unlockedLevels = useProgressStore((s) => s.unlockedLevels);
  const lastPlayedLevel = useProgressStore((s) => s.lastPlayedLevel);
  const levelEntries = useProgressStore((s) => s.levels);

  const nodes = useMemo(() => {
    return WORLD_1_LEVELS.map((level) => {
      const completed = !!levelEntries[level.id];
      const unlocked = unlockedLevels.includes(level.id);
      let state: LevelNodeState = 'locked';
      if (completed) state = 'completed';
      else if (unlocked) state = 'unlocked';
      if (lastPlayedLevel === level.id && !completed) state = 'current';
      return { level, state };
    });
  }, [unlockedLevels, lastPlayedLevel, levelEntries]);

  const startLevel = (id: string) => {
    if (campaign.startLevel(id)) {
      navigation.navigate('Game', { levelId: id });
    }
  };

  return (
    <ScreenBackground>
      <TopBar title="Saga Map" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>WORLD 1</Text>
          <Text style={styles.worldName}>{WORLD_1.name}</Text>
          <Text style={styles.worldTagline}>{WORLD_1.tagline}</Text>
        </View>

        <View style={styles.path}>
          {nodes.map(({ level, state }) => {
            const { swing, gap } = layoutFor(level.index);
            const stars = (levelEntries[level.id]?.stars ?? 0) as 0 | 1 | 2 | 3;
            const crown = !!levelEntries[level.id]?.crown;
            return (
              <View
                key={level.id}
                style={[
                  styles.nodeWrap,
                  {
                    transform: [{ translateX: swing * 90 }],
                    marginTop: level.index === 1 ? 0 : gap,
                  },
                ]}
              >
                <LevelNode
                  index={level.index}
                  state={state}
                  stars={stars}
                  crown={crown}
                  onPress={() => startLevel(level.id)}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </ScreenBackground>
  );
}

export default MapScreen;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.jumbo,
  },
  headerBlock: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    marginBottom: spacing.xs,
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
  path: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  nodeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpacer: {
    height: spacing.xxxl,
  },
});
