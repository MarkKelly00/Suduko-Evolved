/**
 * LevelPreviewModal
 *
 * Premium "tap-the-node" sheet that gates the gameplay launch behind a
 * preview of context, progress, and social state for the level. Two
 * render branches:
 *
 *   • Unlocked branch — full preview: header (LEVEL N · Act · Landmark),
 *     Your Best card, Friend Best card, Global Best card (with celebratory
 *     #1 variant), Targets card, and the LevelCTAStack (Play / Challenge /
 *     View Leaderboard).
 *
 *   • Locked branch — minimal sheet: "LOCKED PATH" treatment, narrative
 *     copy referencing the prerequisite level, and a single CTA to
 *     dismiss. No Play button.
 *
 * Async preview data (friend / global best) loads in parallel after the
 * modal opens. The local "Your Best" snapshot renders synchronously so
 * there's no flash-of-empty-card while Supabase resolves.
 *
 * Visual language mirrors TutorialModal (transparent Modal + scrim +
 * glass card + Premium buttons). Haptic on open + on Play. Respects
 * useSettingsStore.reducedMotion via hapticsService internals.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LevelScoreCard } from './LevelScoreCard';
import { FriendScorePreview } from './FriendScorePreview';
import { GlobalScorePreview } from './GlobalScorePreview';
import { LevelCTAStack } from './LevelCTAStack';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useAuthStore } from '@/game/state/useAuthStore';
import { hapticsService } from '@/services/haptics/hapticsService';
import { formatDifficulty, type Difficulty } from '@/game/engine';
import {
  getLocalLevelPreviewShell,
  getLevelPreview,
  type LevelPreview,
} from '@/services/levels/levelPreviewService';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';

interface Props {
  /** When non-null the modal opens for that level index (1..30). */
  levelIndex: number | null;
  onClose: () => void;
  onPlay: (levelIndex: number) => void;
  onChallengeFriend: (preview: LevelPreview) => void;
  onViewLeaderboard: (preview: LevelPreview) => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function targetTimeLabel(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LevelPreviewModal({
  levelIndex,
  onClose,
  onPlay,
  onChallengeFriend,
  onViewLeaderboard,
}: Props) {
  const visible = levelIndex != null;
  const authStatus = useAuthStore((s) => s.status);
  const isAuthed = authStatus === 'authenticated';

  // Two-pass data load: synchronous shell on open (instant render of
  // local data) → cloud-merged preview after Supabase resolves.
  const initial = useMemo<LevelPreview | null>(() => {
    if (levelIndex == null) return null;
    return getLocalLevelPreviewShell(levelIndex);
  }, [levelIndex]);
  const [preview, setPreview] = useState<LevelPreview | null>(initial);

  useEffect(() => {
    if (levelIndex == null) {
      setPreview(null);
      return;
    }
    // Reset to local shell first so opening a different level doesn't
    // flash stale data from the previous level.
    setPreview(getLocalLevelPreviewShell(levelIndex));
    let cancelled = false;
    void hapticsService.light();
    getLevelPreview(levelIndex)
      .then((full) => {
        if (!cancelled) setPreview(full);
      })
      .catch(() => {
        // Network failures fall back to the local shell — already set above.
      });
    return () => {
      cancelled = true;
    };
  }, [levelIndex]);

  if (!visible || !preview) return null;

  const { isLocked } = preview;

  const handlePlay = () => {
    void hapticsService.success();
    onClose();
    // Defer to next tick so the modal close animation plays before the
    // navigation transition.
    setTimeout(() => onPlay(preview.levelIndex), 60);
  };

  const handleChallenge = () => {
    onChallengeFriend(preview);
  };

  const handleLeaderboard = () => {
    onViewLeaderboard(preview);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.card}>
            {isLocked ? (
              <LockedBody preview={preview} onClose={onClose} />
            ) : (
              <UnlockedBody
                preview={preview}
                isAuthed={isAuthed}
                onPlay={handlePlay}
                onChallengeFriend={handleChallenge}
                onViewLeaderboard={handleLeaderboard}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Body: unlocked ────────────────────────────────────────────────────────

function UnlockedBody({
  preview,
  isAuthed,
  onPlay,
  onChallengeFriend,
  onViewLeaderboard,
}: {
  preview: LevelPreview;
  isAuthed: boolean;
  onPlay: () => void;
  onChallengeFriend: () => void;
  onViewLeaderboard: () => void;
}) {
  const { yourBest, friendBest, globalBest, targets } = preview;
  return (
    <>
      <Header preview={preview} />

      {/* Your Best */}
      {yourBest ? (
        <LevelScoreCard
          eyebrow="Your best"
          title={`${yourBest.score.toLocaleString('en-US')}`}
          subtitle={`${formatTime(yourBest.timeMs)}${
            yourBest.mistakes !== undefined
              ? ` · ${yourBest.mistakes} mistake${yourBest.mistakes === 1 ? '' : 's'}`
              : ''
          }${
            yourBest.hints !== undefined && yourBest.hints > 0
              ? ` · ${yourBest.hints} hint${yourBest.hints === 1 ? '' : 's'}`
              : ''
          }`}
          stars={yourBest.stars}
          crown={yourBest.crown}
          accent="gold"
          isHighlight={yourBest.crown}
        />
      ) : (
        <LevelScoreCard
          eyebrow="Your best"
          title="No clear yet"
          subtitle="Land a clean run to claim a star here."
          accent="gold"
        />
      )}

      {/* Friend / Global */}
      <FriendScorePreview peer={friendBest} isAuthed={isAuthed} />
      <GlobalScorePreview peer={globalBest} />

      {/* Targets */}
      <LevelScoreCard eyebrow="Targets" accent="navy">
        <View style={styles.targetRow}>
          <View style={styles.targetCell}>
            <Text style={styles.targetLabel}>2★</Text>
            <Text style={styles.targetValue}>
              {targets.twoStarThreshold.toLocaleString('en-US')}
            </Text>
          </View>
          <View style={styles.targetCell}>
            <Text style={styles.targetLabel}>3★</Text>
            <Text style={styles.targetValue}>
              {targets.threeStarThreshold.toLocaleString('en-US')}
            </Text>
          </View>
          <View style={styles.targetCell}>
            <Text style={styles.targetLabel}>Crown time</Text>
            <Text style={styles.targetValue}>
              {targetTimeLabel(targets.targetTimeSeconds)}
            </Text>
          </View>
        </View>
      </LevelScoreCard>

      {/* CTAs */}
      <LevelCTAStack
        isCompleted={preview.isCompleted}
        onPlay={onPlay}
        onChallengeFriend={onChallengeFriend}
        onViewLeaderboard={onViewLeaderboard}
      />
    </>
  );
}

// ─── Body: locked ──────────────────────────────────────────────────────────

function LockedBody({
  preview,
  onClose,
}: {
  preview: LevelPreview;
  onClose: () => void;
}) {
  const prereq = preview.prerequisiteLevelIndex;
  return (
    <>
      <Header preview={preview} lockedOverride />
      <LevelScoreCard
        eyebrow="Locked path"
        title={
          prereq != null
            ? `Clear Level ${prereq} to unlock`
            : 'Path not yet revealed'
        }
        subtitle="Logic Garden opens one bloom at a time."
        accent="navy"
      />
      <PremiumButton
        label="Back to map"
        variant="primary"
        onPress={onClose}
      />
    </>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────

function Header({
  preview,
  lockedOverride,
}: {
  preview: LevelPreview;
  lockedOverride?: boolean;
}) {
  const { levelIndex, act, landmark, difficulty } = preview;
  const eyebrow = lockedOverride
    ? `Level ${levelIndex} · Locked`
    : `Level ${levelIndex} · ${formatDifficulty(difficulty as Difficulty)}`;
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text
        style={[styles.title, { color: act.primary }]}
        accessibilityRole="header"
      >
        {landmark ?? act.title}
      </Text>
      <Text style={styles.subtitle}>{act.title}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  header: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
    gap: 2,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    textAlign: 'center',
    textShadowColor: 'rgba(245,213,138,0.45)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
    marginTop: 2,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  targetCell: {
    flex: 1,
  },
  targetLabel: {
    color: colors.textDim,
    fontSize: fontSize.xxs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  targetValue: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    marginTop: 2,
  },
});
