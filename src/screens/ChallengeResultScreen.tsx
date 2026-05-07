import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Avatar } from '@/components/profile/Avatar';
import { challengeService } from '@/services/supabase';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  shadows,
  spacing,
} from '@/theme';
import { formatDuration } from '@/utils/formatTime';
import type { RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';

export default function ChallengeResultScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const route = useRoute<RootRouteProp<'ChallengeResult'>>();
  const { you, them, winnerId, challengeId } = route.params;

  const youWon = winnerId === you.userId;
  const theyWon = winnerId === them.userId;
  const draw = winnerId == null;

  const handleRematch = async () => {
    try {
      await challengeService.createRematch(challengeId);
      navigation.popToTop();
      navigation.navigate('Friends', { initialTab: 'challenges' });
    } catch {
      navigation.popToTop();
      navigation.navigate('Friends', { initialTab: 'challenges' });
    }
  };

  return (
    <ScreenBackground>
      <TopBar title="Challenge Result" showBack={false} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.versusBlock}>
          <View style={styles.side}>
            <Avatar size="lg" url={you.avatarUrl} fallbackName={you.name} />
            <Text style={styles.name}>You</Text>
            {youWon ? <WinnerBanner /> : null}
          </View>
          <Text style={styles.versus}>vs</Text>
          <View style={styles.side}>
            <Avatar size="lg" url={them.avatarUrl} fallbackName={them.name} />
            <Text style={styles.name}>{them.name}</Text>
            {theyWon ? <WinnerBanner /> : null}
          </View>
        </View>

        {draw ? (
          <Text style={styles.drawText}>Draw — perfectly matched.</Text>
        ) : null}

        <GlassCard>
          <ResultRow label="Score" yourValue={you.score.toLocaleString()} theirValue={them.score.toLocaleString()} highlightYou={you.score >= them.score} />
          <ResultRow
            label="Time"
            yourValue={formatDuration(you.timeSeconds)}
            theirValue={formatDuration(them.timeSeconds)}
            highlightYou={you.timeSeconds <= them.timeSeconds}
          />
          <ResultRow
            label="Mistakes"
            yourValue={`${you.mistakes}`}
            theirValue={`${them.mistakes}`}
            highlightYou={you.mistakes <= them.mistakes}
          />
          <ResultRow
            label="Hints"
            yourValue={`${you.hints}`}
            theirValue={`${them.hints}`}
            highlightYou={you.hints <= them.hints}
          />
          {(you.crown || them.crown) ? (
            <ResultRow
              label="Perfect"
              yourValue={you.crown ? '' : ''}
              theirValue={them.crown ? '' : ''}
            />
          ) : null}
        </GlassCard>

        <View style={styles.actions}>
          <PremiumButton label="Rematch" variant="primary" onPress={handleRematch} />
          <PremiumButton
            label="Back to Friends"
            variant="ghost"
            onPress={() => {
              navigation.popToTop();
              navigation.navigate('Friends', { initialTab: 'challenges' });
            }}
          />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

function WinnerBanner() {
  return (
    <View style={[styles.banner, shadows.goldGlow as object]}>
      <Text style={styles.bannerText}>WINNER</Text>
    </View>
  );
}

function ResultRow({
  label,
  yourValue,
  theirValue,
  highlightYou,
}: {
  label: string;
  yourValue: string;
  theirValue: string;
  highlightYou?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.cellValue,
          highlightYou ? { color: colors.accentGoldGlow, fontWeight: fontWeight.bold } : null,
        ]}
      >
        {yourValue}
      </Text>
      <Text style={styles.cellLabel}>{label.toUpperCase()}</Text>
      <Text
        style={[
          styles.cellValue,
          { textAlign: 'right' },
          highlightYou === false ? { color: colors.accentGoldGlow, fontWeight: fontWeight.bold } : null,
        ]}
      >
        {theirValue}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  versusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
  },
  side: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  versus: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
    textShadowColor: colors.accentGoldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  banner: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    backgroundColor: colors.accentGold,
    borderRadius: 999,
  },
  bannerText: {
    color: colors.textOnGold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
  },
  drawText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  cellValue: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.base,
    fontFamily: fontFamily.display,
  },
  cellLabel: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
});
