/**
 * GlobalScorePreview
 *
 * "Global Best" card in the LevelPreviewModal. Three render states:
 *   1. Player IS the global #1 → celebratory variant ("You hold the spot.")
 *   2. Someone else holds it    → standard peer row
 *   3. No global rows yet       → polished placeholder
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LevelScoreCard } from './LevelScoreCard';
import {
  colors,
  fontSize,
  letterSpacing,
} from '@/theme';
import type { LevelPreviewPeer } from '@/services/levels/levelPreviewService';

interface Props {
  peer: LevelPreviewPeer | null;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function GlobalScorePreview({ peer }: Props) {
  if (!peer) {
    return (
      <LevelScoreCard
        eyebrow="Global best"
        title="No clears yet"
        subtitle="Be the first to hold this spot."
        accent="gold"
      />
    );
  }

  // Self-celebration variant: the caller IS the global #1.
  if (peer.isSelf) {
    return (
      <LevelScoreCard
        eyebrow="Global best"
        eyebrowAccessory="You hold #1"
        title="You hold the spot."
        subtitle={`${peer.score.toLocaleString('en-US')} · ${formatTime(peer.timeMs)}`}
        avatarUrl={peer.avatarUrl}
        fallbackName={peer.displayName}
        stars={(peer.stars ?? 0) as 0 | 1 | 2 | 3}
        crown={peer.crown}
        accent="gold"
        isHighlight
      >
        <Text style={styles.foot}>
          Hold it: clear cleaner, faster, or with fewer hints.
        </Text>
      </LevelScoreCard>
    );
  }

  return (
    <LevelScoreCard
      eyebrow="Global best"
      title={peer.displayName}
      subtitle={peer.username ? `@${peer.username}` : undefined}
      avatarUrl={peer.avatarUrl}
      fallbackName={peer.displayName}
      score={peer.score}
      timeLabel={formatTime(peer.timeMs)}
      stars={(peer.stars ?? 0) as 0 | 1 | 2 | 3}
      crown={peer.crown}
      accent="gold"
    />
  );
}

const styles = StyleSheet.create({
  foot: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
  },
});
