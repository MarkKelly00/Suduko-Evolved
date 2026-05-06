import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { CurrencyPill } from '@/components/ui/CurrencyPill';
import { useProgressStore } from '@/game/state/useProgressStore';
import { campaign } from '@/game/modes/campaign';
import { levelId, getLevelById } from '@/game/content/levels';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type { RootStackNavigation } from '@/app/navigation/routes';

function HomeScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const totalXP = useProgressStore((s) => s.totalXP);
  const currentStreak = useProgressStore((s) => s.currentStreak);
  const lastPlayedLevel = useProgressStore((s) => s.lastPlayedLevel);

  const continueLevelId =
    (lastPlayedLevel && getLevelById(lastPlayedLevel)?.id) ?? levelId(1);

  const handleContinue = () => {
    if (campaign.startLevel(continueLevelId)) {
      navigation.navigate('Game', { levelId: continueLevelId });
    }
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <CurrencyPill label="XP" value={totalXP} icon="✦" />
          <CurrencyPill label="streak" value={currentStreak} icon="✺" />
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>SUDOKU</Text>
          <Text style={styles.title}>Evolved</Text>
          <Text style={styles.tagline}>Pure logic. Cinematic feel.</Text>
        </View>

        <View style={styles.actions}>
          <PremiumButton label="Continue" onPress={handleContinue} variant="primary" />
          <PremiumButton
            label="Saga Map"
            onPress={() => navigation.navigate('Map')}
            variant="secondary"
          />
          <PremiumButton
            label="Time Trial"
            onPress={() => navigation.navigate('TimeTrial')}
            variant="secondary"
          />
          <PremiumButton
            label="Profile"
            onPress={() => navigation.navigate('Profile')}
            variant="ghost"
            compact
          />
          <PremiumButton
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
            variant="ghost"
            compact
          />
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>World 1 · Logic Garden</Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

// React Navigation expects a default export when used with `navigator.Screen
// component={HomeScreen}` works either way; we keep both for safety.
export default HomeScreen;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  heroBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.jumbo,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.wider,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    textShadowColor: colors.accentGoldGlow,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontSize: fontSize.md,
  },
  actions: {
    gap: spacing.sm,
  },
  footerNote: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
  },
});
