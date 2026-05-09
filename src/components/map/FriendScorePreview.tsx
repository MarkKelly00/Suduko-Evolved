/**
 * FriendScorePreview
 *
 * "Friend to Beat" card in the LevelPreviewModal. Three render states:
 *   1. Authed + has friend score → render the friend's row.
 *   2. Authed + no friend score   → "No friend clears yet — invite a friend."
 *   3. Unauthed                    → "Sign in to compare with friends."
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
  isAuthed: boolean;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function FriendScorePreview({ peer, isAuthed }: Props) {
  if (!isAuthed) {
    return (
      <LevelScoreCard
        eyebrow="Friend to beat"
        title="Sign in to compare"
        subtitle="See your friends' bests right here."
        accent="cyan"
      />
    );
  }
  if (!peer) {
    return (
      <LevelScoreCard
        eyebrow="Friend to beat"
        title="No friend clears yet"
        subtitle="Invite a friend to leave their mark."
        accent="cyan"
      />
    );
  }
  return (
    <LevelScoreCard
      eyebrow="Friend to beat"
      title={peer.displayName}
      subtitle={peer.username ? `@${peer.username}` : undefined}
      avatarUrl={peer.avatarUrl}
      fallbackName={peer.displayName}
      score={peer.score}
      timeLabel={formatTime(peer.timeMs)}
      stars={(peer.stars ?? 0) as 0 | 1 | 2 | 3}
      crown={peer.crown}
      accent="cyan"
    >
      <Text style={styles.foot}>
        Beat {peer.score.toLocaleString('en-US')} in {formatTime(peer.timeMs)} to take the crown.
      </Text>
    </LevelScoreCard>
  );
}

const styles = StyleSheet.create({
  foot: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
  },
});
