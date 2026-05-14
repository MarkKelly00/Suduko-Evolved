import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
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

  // Track the ACTUAL iOS notification permission status so the toggle's
  // display reflects reality. Previous version showed `notificationPrefs
  // .enabled` (defaults to true), so a fresh-install user saw the
  // toggle as ON even though iOS had never been asked — tapping the
  // toggle then had no visible effect because the user was already
  // "on" from our perspective. Now: master toggle is visually ON only
  // when our pref is true AND iOS has granted permission.
  const [iosPermStatus, setIosPermStatus] = useState<
    'granted' | 'denied' | 'undetermined' | 'unknown'
  >('unknown');

  const refreshIosPermStatus = useCallback(async () => {
    try {
      const s = await Notifications.getPermissionsAsync();
      setIosPermStatus(
        s.status === 'granted'
          ? 'granted'
          : s.status === 'denied'
            ? 'denied'
            : 'undetermined',
      );
    } catch {
      setIosPermStatus('unknown');
    }
  }, []);

  useEffect(() => {
    void refreshIosPermStatus();
    // Re-check whenever the app comes back to the foreground —
    // catches the case where the user flipped iOS Settings while
    // we were backgrounded.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshIosPermStatus();
    });
    return () => sub.remove();
  }, [refreshIosPermStatus]);

  /**
   * Master push toggle handler. Three meaningful transitions:
   *   - OFF → ON (iOS undetermined): show the system permission prompt.
   *     On grant, flip pref true + register token.
   *   - OFF → ON (iOS denied):       offer to deep-link to iOS Settings.
   *   - ON  → OFF:                   flip pref false. Server-side
   *                                  trigger then short-circuits via
   *                                  `should_send_push`.
   *
   * The OFF → ON (iOS granted) case is "instant re-enable" — no prompt
   * needed because iOS perms are still on. Just flips our pref.
   */
  const handleToggleMasterPush = async (enabled: boolean) => {
    if (!enabled) {
      settings.setNotificationPref('enabled', false);
      return;
    }
    // User wants ON. Check actual iOS status first.
    if (iosPermStatus === 'granted') {
      settings.setNotificationPref('enabled', true);
      void registerForPushNotifications();
      return;
    }
    if (iosPermStatus === 'denied') {
      Alert.alert(
        'Enable notifications',
        'Notifications are turned off for Sudoku Evolved in iOS Settings. Open Settings to re-enable?',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }
    // undetermined or unknown — fire the iOS prompt.
    const result = await requestPushPermissions();
    await refreshIosPermStatus();
    if (result.granted) {
      settings.setNotificationPref('enabled', true);
      void registerForPushNotifications();
    }
    // Decline path: leave our pref false (no notifications fire) and
    // no further nag — iOS won't show the prompt again until the user
    // re-enables in Settings, which we'll pick up via AppState.
  };

  // Master toggle is "on" only when both our pref AND iOS perms agree.
  const masterPushOn =
    settings.notificationPrefs.enabled && iosPermStatus === 'granted';

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
          {iosPermStatus === 'denied' ? (
            <Text style={styles.gcStatus}>
              {'Disabled in iOS Settings — tap the toggle to re-enable'}
            </Text>
          ) : null}
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
