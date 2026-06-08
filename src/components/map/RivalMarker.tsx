/**
 * RivalMarker — an optional, lightweight competitive glint drawn next to a
 * level node. Gated by the `enableMapRivalMarkers` feature flag at the call
 * site; this component additionally renders NOTHING when there's no rival data
 * for the level (the common case until the player opens that level's preview).
 *
 * Variants (priority order):
 *   • reclaim-crown — gold aura ring: you crowned this level but a rival now
 *     leads it. "Reclaim Crown."
 *   • friend-beat   — small cyan glint: a friend has a better score.
 *   • crowned       — faint gold dot: you hold the crown here.
 *
 * Decorative only (`pointerEvents="none"`), so it never blocks node taps.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRivalMarkerStore } from './rivalMarkerStore';
import { colors } from '@/theme';

interface Props {
  levelId: string;
  /** Node diameter, to position the glint at the top-right corner. */
  nodeSize: number;
}

export function RivalMarker({ levelId, nodeSize }: Props) {
  const info = useRivalMarkerStore((s) => s.markers[levelId]);
  if (!info) return null;
  const { reclaimCrown, friendBeat, crowned } = info;
  if (!reclaimCrown && !friendBeat && !crowned) return null;

  const variant: 'reclaim-crown' | 'friend-beat' | 'crowned' = reclaimCrown
    ? 'reclaim-crown'
    : friendBeat
      ? 'friend-beat'
      : 'crowned';

  const palette = {
    'reclaim-crown': { dot: colors.accentGoldGlow, ring: 'rgba(245,213,138,0.55)' },
    'friend-beat': { dot: colors.accentBlue, ring: 'rgba(123,167,242,0.45)' },
    crowned: { dot: colors.accentGold, ring: 'rgba(224,185,106,0.35)' },
  }[variant];

  // Top-right corner of the node.
  const offset = nodeSize * 0.5 - 6;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.wrap,
        { right: -offset + nodeSize * 0.5, top: -offset + nodeSize * 0.5 },
      ]}
    >
      <View style={[styles.ring, { borderColor: palette.ring }]} />
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
