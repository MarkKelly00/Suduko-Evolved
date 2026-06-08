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
  Pressable,
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
  /** When non-null the modal opens for that GLOBAL level number (1..60).
   *  1–30 → Logic Garden, 31–60 → Astral Nexus. */
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
      {/* The scrim is itself a Pressable so taps on the dimmed area
          outside the card dismiss the modal — standard iOS pattern.
          The card swallows its own touches via onStartShouldSetResponder
          so taps inside the card don't propagate to the scrim. */}
      <Pressable
        style={styles.scrim}
        onPress={onClose}
        accessibilityLabel="Close preview"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View
            style={styles.card}
            onStartShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
          >
            <CloseButton onPress={onClose} />
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
      </Pressable>
    </Modal>
  );
}

// ─── Close button ──────────────────────────────────────────────────────────
//
// Anchored top-right of the card so the player has an unmissable way to
// dismiss the preview. Glyph is a plain `×` (Unicode U+00D7) styled large
// — the codebase doesn't pull in any icon fonts; this matches the existing
// text-based glyph convention used elsewhere (e.g. TopBar's `‹` chevron).
function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.closeButton,
        pressed && styles.closeButtonPressed,
      ]}
    >
      <Text style={styles.closeIcon}>{'×'}</Text>
    </Pressable>
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
  const { yourBest, friendBest, globalBest, targets, prestige, scoreToBeat } = preview;
  const yourBestEyebrow = prestige ? 'Beat your best' : 'Your best';
  const emptyBestSubtitle = prestige
    ? 'The pattern waits.'
    : 'Land a clean run to claim a star here.';
  return (
    <>
      <Header preview={preview} />

      {/* Your Best */}
      {yourBest ? (
        <LevelScoreCard
          eyebrow={yourBestEyebrow}
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
          eyebrow={yourBestEyebrow}
          title="No clear yet"
          subtitle={emptyBestSubtitle}
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
        {scoreToBeat ? (
          <Text style={styles.scoreToBeat}>
            {scoreToBeat.label}: {scoreToBeat.score.toLocaleString('en-US')} to beat
          </Text>
        ) : null}
      </LevelScoreCard>

      {/* CTAs */}
      <LevelCTAStack
        isCompleted={preview.isCompleted}
        onPlay={onPlay}
        onChallengeFriend={onChallengeFriend}
        onViewLeaderboard={onViewLeaderboard}
        primaryLabel={preview.reclaimCrown ? 'Reclaim Crown' : undefined}
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
  const gate = preview.worldGate;
  // A whole-world gate (entering Astral Nexus before finishing Logic Garden)
  // reads differently from an in-world lock.
  const title = gate
    ? `Complete ${gate.requiredWorldName} to open the path`
    : prereq != null
      ? `Clear Level ${prereq} to unlock`
      : 'Path not yet revealed';
  const subtitle = gate
    ? 'The Astral Nexus awaits.'
    : preview.prestige
      ? 'The Nexus reveals itself one pattern at a time.'
      : 'Logic Garden opens one bloom at a time.';
  return (
    <>
      <Header preview={preview} lockedOverride />
      <LevelScoreCard eyebrow="Locked path" title={title} subtitle={subtitle} accent="navy" />
      <PremiumButton label="Back to map" variant="primary" onPress={onClose} />
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
  const { levelIndex, act, landmark, difficulty, prestige, worldName } = preview;
  const eyebrow = lockedOverride
    ? `Level ${levelIndex} · Locked`
    : `Level ${levelIndex} · ${formatDifficulty(difficulty as Difficulty)}`;
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text
        style={[
          styles.title,
          { color: act.primary },
          // World 2 title glows in its cosmic accent instead of the garden gold.
          prestige ? { textShadowColor: 'rgba(157,123,255,0.5)' } : null,
        ]}
        accessibilityRole="header"
      >
        {landmark ?? act.title}
      </Text>
      <Text style={styles.subtitle}>
        {prestige ? `${worldName} · ${act.title}` : act.title}
      </Text>
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
    // Extra top padding leaves room for the absolutely-positioned
    // CloseButton in the top-right corner without crowding the LEVEL N
    // eyebrow underneath it.
    paddingTop: spacing.xl + spacing.base,
    gap: spacing.sm,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(11,18,32,0.72)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  closeButtonPressed: { opacity: 0.7 },
  closeIcon: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginTop: -2,
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
  scoreToBeat: {
    color: colors.accentGoldGlow,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
