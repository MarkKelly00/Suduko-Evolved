import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { useProgressStore } from '@/game/state/useProgressStore';
import {
  colors,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.divider, true: colors.accentGoldDim }}
        thumbColor={value ? colors.accentGoldGlow : colors.textMuted}
      />
    </View>
  );
}

function SettingsScreen() {
  const settings = useSettingsStore();
  const resetAll = useSettingsStore((s) => s.resetAll);
  const progressReset = useProgressStore((s) => s.reset);
  const [confirming, setConfirming] = useState(false);

  const handleReset = () => {
    if (!confirming) {
      Alert.alert(
        'Reset all progress?',
        'This permanently removes your stars, XP, and best times. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => {
              resetAll();
              progressReset();
            },
          },
        ],
      );
      setConfirming(false);
    }
  };

  return (
    <ScreenBackground>
      <TopBar title="Settings" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Audio &amp; Haptics</Text>
          <ToggleRow
            label="Sound"
            description="In-game SFX and music"
            value={settings.soundEnabled}
            onValueChange={settings.setSoundEnabled}
          />
          <ToggleRow
            label="Haptics"
            description="Tactile feedback for placements and milestones"
            value={settings.hapticsEnabled}
            onValueChange={settings.setHapticsEnabled}
          />
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          <ToggleRow
            label="Reduced motion"
            description="Tone down or skip non-essential animations"
            value={settings.reducedMotion}
            onValueChange={settings.setReducedMotion}
          />
          <ToggleRow
            label="High contrast"
            description="Stronger borders and text for clarity"
            value={settings.highContrast}
            onValueChange={settings.setHighContrast}
          />
          <ToggleRow
            label="Colorblind safe"
            description="Adds non-color cues for same-number highlights"
            value={settings.colorblindMode}
            onValueChange={settings.setColorblindMode}
          />
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <Text style={styles.rowDescription}>
            Wipe all local progress and reset settings to defaults.
          </Text>
          <PremiumButton
            label="Reset local progress"
            onPress={handleReset}
            variant="secondary"
            compact
            style={styles.resetButton}
          />
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

export default SettingsScreen;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.base,
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  rowLabel: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  rowDescription: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  resetButton: {
    marginTop: spacing.sm,
  },
});
