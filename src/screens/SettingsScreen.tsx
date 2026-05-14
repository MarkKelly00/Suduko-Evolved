import React, { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { useProgressStore } from '@/game/state/useProgressStore';
import {
  gameCenterService,
  isPlatformIOS,
} from '@/services/gameCenter';
import {
  requestPermissionsAsync as requestPushPermissions,
  registerForPushNotifications,
} from '@/services/notifications/pushService';
import {
  colors,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';

type GameCenterStatus =
  | 'unknown'
  | 'connected'
  | 'not-connected'
  | 'unavailable'
  | 'try-again-next-launch';

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

  // Game Center state. The status drives the inline copy under the
  // toggle row (Connected / Not connected / Try again next launch).
  // Refreshed on mount + after every opt-in flip.
  const [gcStatus, setGcStatus] = useState<GameCenterStatus>('unknown');

  useEffect(() => {
    if (!isPlatformIOS()) {
      setGcStatus('unavailable');
      return;
    }
    if (!gameCenterService.isAvailable()) {
      setGcStatus('unavailable');
      return;
    }
    let cancelled = false;
    void (async () => {
      const authed = await gameCenterService.isAuthenticated();
      if (cancelled) return;
      setGcStatus(authed ? 'connected' : 'not-connected');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleGameCenter = async (enabled: boolean) => {
    settings.setGameCenterOptIn(enabled);
    if (!enabled) {
      // Toggling off only stops new submissions — Apple controls the
      // actual sign-in state, so we leave the device-level auth alone.
      return;
    }
    // Toggling on triggers the system sign-in sheet (Apple's UX is
    // unsuppressible once `presentSignIn: true` is passed). On
    // success, status flips to Connected. On dismissal, the user
    // can't be re-prompted in this app session — surface a hint so
    // they know to try again on next launch.
    const result = await gameCenterService.authenticate({
      presentSignIn: true,
    });
    if (result.authenticated) {
      setGcStatus('connected');
    } else if (result.requiresSignIn === false && result.reason === 'auth-already-attempted') {
      setGcStatus('try-again-next-launch');
    } else {
      setGcStatus('not-connected');
    }
  };

  const handleShowLeaderboards = () => {
    void gameCenterService.showLeaderboard();
  };

  const handleShowAchievements = () => {
    void gameCenterService.showAchievements();
  };

  /**
   * When the user flips the master push toggle ON, we run the iOS
   * permission flow if it hasn't been asked yet. If iOS has already
   * denied us, we deep-link to the system Settings page (only path
   * back to "enabled" once denied).
   */
  const handleToggleMasterPush = async (enabled: boolean) => {
    settings.setNotificationPref('enabled', enabled);
    if (!enabled) return;
    const result = await requestPushPermissions();
    if (result.granted) {
      void registerForPushNotifications();
      return;
    }
    if (!result.prompted) {
      // Already denied at some point. Offer to deep-link.
      Alert.alert(
        'Enable notifications',
        'Notifications are turned off for Sudoku Evolved in iOS Settings. Open Settings to re-enable?',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ],
      );
    }
  };

  const masterPushOn = settings.notificationPrefs.enabled;

  const gcStatusLabel: string = (() => {
    switch (gcStatus) {
      case 'connected':
        return 'Connected to Game Center';
      case 'not-connected':
        return 'Not signed in';
      case 'unavailable':
        return 'Unavailable on this device';
      case 'try-again-next-launch':
        return 'Sign in dismissed — try again on next launch';
      default:
        return 'Checking…';
    }
  })();
  const gcButtonsEnabled = gcStatus === 'connected';

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
          <Text style={styles.sectionTitle}>Notifications</Text>
          <ToggleRow
            label="Push notifications"
            description="Lock-screen alerts for friend activity"
            value={masterPushOn}
            onValueChange={(v) => void handleToggleMasterPush(v)}
          />
          {masterPushOn ? (
            <View style={styles.subTogglesWrap}>
              <ToggleRow
                label="Challenges"
                description="A friend challenges you on a level or sprint"
                value={settings.notificationPrefs.challenges}
                onValueChange={(v) => settings.setNotificationPref('challenges', v)}
              />
              <ToggleRow
                label="Friend requests"
                description="Someone sends you a friend request"
                value={settings.notificationPrefs.friendRequests}
                onValueChange={(v) => settings.setNotificationPref('friendRequests', v)}
              />
              <ToggleRow
                label="Score beats"
                description="A friend beats your best on a level"
                value={settings.notificationPrefs.scoreBeats}
                onValueChange={(v) => settings.setNotificationPref('scoreBeats', v)}
              />
              <ToggleRow
                label="Acceptances"
                description="Friend / challenge / duel acceptances"
                value={settings.notificationPrefs.acceptances}
                onValueChange={(v) => settings.setNotificationPref('acceptances', v)}
              />
              <ToggleRow
                label="Duel invites"
                description="A friend accepts your invite link"
                value={settings.notificationPrefs.duelInvites}
                onValueChange={(v) => settings.setNotificationPref('duelInvites', v)}
              />
            </View>
          ) : null}
        </GlassCard>

        {isPlatformIOS() && gcStatus !== 'unavailable' ? (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Game Center</Text>
            <ToggleRow
              label="Connect to Game Center"
              description="Sync achievements and native leaderboards with your Apple ID."
              value={settings.gameCenterOptIn}
              onValueChange={handleToggleGameCenter}
            />
            <Text style={styles.gcStatus}>{gcStatusLabel}</Text>
            <PremiumButton
              label="Show leaderboards"
              variant="secondary"
              compact
              onPress={handleShowLeaderboards}
              disabled={!gcButtonsEnabled}
              style={styles.gcButton}
            />
            <PremiumButton
              label="Show achievements"
              variant="secondary"
              compact
              onPress={handleShowAchievements}
              disabled={!gcButtonsEnabled}
              style={styles.gcButton}
            />
          </GlassCard>
        ) : null}

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
  gcStatus: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: -spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  gcButton: {
    marginTop: spacing.xs,
  },
  subTogglesWrap: {
    paddingLeft: spacing.base,
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
    marginTop: spacing.xxs,
  },
});
