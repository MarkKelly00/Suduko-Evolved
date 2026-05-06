import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { StarRating } from '@/components/ui/StarRating';
import { CurrencyPill } from '@/components/ui/CurrencyPill';
import { campaign } from '@/game/modes/campaign';
import { getLevelById, nextLevelId } from '@/game/content/levels';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import { formatDuration } from '@/utils/formatTime';
import { hapticsService } from '@/services/haptics/hapticsService';
import { audioService } from '@/services/audio/audioService';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

function ResultsScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const route = useRoute<RootRouteProp<'Results'>>();
  const { levelId, score, stars, crown, timeSeconds, mistakes, hintsUsed, xp } = route.params;
  const level = getLevelById(levelId);

  useEffect(() => {
    audioService.playPuzzleComplete();
    if (crown) hapticsService.puzzleComplete();
    else hapticsService.success();
  }, [crown]);

  const nextId = nextLevelId(levelId);

  const handleNext = () => {
    if (!nextId) {
      navigation.navigate('Map');
      return;
    }
    if (campaign.startLevel(nextId)) navigation.replace('Game', { levelId: nextId });
  };
  const handleReplay = () => {
    if (campaign.startLevel(levelId)) navigation.replace('Game', { levelId });
  };
  const handleMap = () => navigation.navigate('Map');
  const handleChallenge = () => {
    // Phase 6+: open friend challenge sheet.
    navigation.navigate('Profile');
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>{level ? `LEVEL ${level.index}` : 'COMPLETE'}</Text>
          <Text style={styles.title}>{crown ? 'Perfect Bloom' : 'Cleared'}</Text>
          <View style={styles.starsWrap}>
            <StarRating stars={stars} crown={crown} size={36} />
          </View>
        </View>

        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <Stat label="Score" value={score.toLocaleString()} />
            <Stat label="Time" value={formatDuration(timeSeconds)} />
          </View>
          <View style={styles.row}>
            <Stat label="Mistakes" value={`${mistakes}`} accent={mistakes > 0 ? colors.mistake : undefined} />
            <Stat label="Hints" value={`${hintsUsed}`} accent={hintsUsed > 0 ? colors.warning : undefined} />
          </View>
          <View style={styles.xpRow}>
            <CurrencyPill label="earned" value={`+${xp}`} icon="✦" />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Friends</Text>
          <Text style={styles.placeholderText}>
            Friend leaderboards arrive in a future update. Game Center submission hooks are in
            place — connect once your build is signed and Game Center capability is enabled.
          </Text>
        </GlassCard>

        <View style={styles.actions}>
          <PremiumButton
            label={nextId ? 'Next Level' : 'Back to Map'}
            onPress={handleNext}
            variant="primary"
          />
          <PremiumButton label="Replay" onPress={handleReplay} variant="secondary" />
          <PremiumButton label="Saga Map" onPress={handleMap} variant="ghost" compact />
          <PremiumButton
            label="Challenge a friend"
            onPress={handleChallenge}
            variant="ghost"
            compact
          />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent ? { color: accent } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default ResultsScreen;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  heroBlock: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.wider,
  },
  title: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
    letterSpacing: letterSpacing.tight,
  },
  starsWrap: {
    marginTop: spacing.base,
  },
  card: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
  },
  actions: {
    gap: spacing.sm,
  },
});
