import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Avatar } from '@/components/profile/Avatar';
import {
  UsernameField,
  type UsernameFieldStatus,
} from '@/components/profile/UsernameField';
import { InlineToast } from '@/components/ui/InlineToast';
import { useAuthStore } from '@/game/state/useAuthStore';
import { authService, profileService } from '@/services/supabase';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';
import type { RootStackNavigation } from '@/app/navigation/routes';

export default function EditProfileScreen() {
  const navigation = useNavigation<RootStackNavigation>();
  const profile = useAuthStore((s) => s.profile);
  const isOnboarding = useAuthStore((s) => s.isOnboarding);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setIsOnboarding = useAuthStore((s) => s.setIsOnboarding);
  const resetToGuest = useAuthStore((s) => s.resetToGuest);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<UsernameFieldStatus>({ state: 'idle' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setUsername(profile?.username ?? '');
  }, [profile]);

  const trimmedDisplayName = displayName
    // Strip ASCII control + DEL.
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
  const dirty =
    trimmedDisplayName !== (profile?.display_name ?? '') ||
    username !== (profile?.username ?? '');
  const usernameOk =
    usernameStatus.state === 'available' ||
    (usernameStatus.state === 'idle' && (profile?.username ?? '') === username);
  const canSave =
    dirty && usernameOk && trimmedDisplayName.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await profileService.updateProfile({
        display_name: trimmedDisplayName,
        username: username,
      });
      if (updated) setProfile(updated);
      setIsOnboarding(false);
      setSuccess('Profile saved');
      // After a beat, dismiss back so we don't leave them on the form.
      setTimeout(() => navigation.goBack(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeAvatar = () => {
    if (!profile?.id) return;
    void launchAvatarPicker(navigation);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign out?',
      'Your local progress stays on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await authService.signOut();
            resetToGuest();
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently removes your profile, avatar, scores, crowns, friends, and challenges. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: () => {
            // Two-step confirmation — destructive, irreversible.
            Alert.alert(
              'Are you sure?',
              `Type-sized confirm: deleting ${
                profile?.username ? `@${profile.username}` : 'this account'
              } will erase everything tied to it on every device.`,
              [
                { text: 'Keep account', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await authService.deleteAccount();
                      resetToGuest();
                      Alert.alert(
                        'Account deleted',
                        'Your account and data have been removed. You can keep playing as a guest.',
                        [{ text: 'OK', onPress: () => navigation.goBack() }],
                      );
                    } catch (err) {
                      const msg =
                        err instanceof Error
                          ? err.message
                          : 'Could not delete your account. Please try again.';
                      Alert.alert('Deletion failed', msg);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ScreenBackground>
      <TopBar title="Edit Profile" />
      <ScrollView contentContainerStyle={styles.body}>
        {isOnboarding ? (
          <GlassCard>
            <Text style={styles.bannerHeading}>Pick a username</Text>
            <Text style={styles.bannerBody}>
              {`It's how friends find you. You can change it later.`}
            </Text>
          </GlassCard>
        ) : null}

        <View style={styles.avatarBlock}>
          <Avatar
            size="xl"
            url={profile?.avatar_url ?? null}
            fallbackName={trimmedDisplayName || profile?.username || null}
          />
          <Pressable
            onPress={handleChangeAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change avatar"
          >
            <Text style={styles.changeAvatar}>Change avatar</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>DISPLAY NAME</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="How friends see you"
              placeholderTextColor={colors.textDim}
              maxLength={30}
              style={styles.input}
              accessibilityLabel="Display name"
            />
          </View>
          <Text style={styles.hint}>Up to 30 characters.</Text>
        </View>

        <UsernameField
          value={username}
          onChange={setUsername}
          onStatusChange={setUsernameStatus}
        />

        {error ? (
          <InlineToast variant="error" message={error} nonce={error} />
        ) : null}
        {success ? (
          <InlineToast variant="success" message={success} nonce={success} />
        ) : null}

        <PremiumButton
          label={saving ? 'Saving…' : 'Save'}
          variant="primary"
          onPress={handleSave}
          disabled={!canSave}
        />

        <PremiumButton
          label="Sign out"
          variant="ghost"
          onPress={handleSignOut}
        />

        <Pressable onPress={handleDeleteAccount} style={styles.deleteLink}>
          <Text style={styles.deleteLinkText}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

/**
 * Lazily loads expo-image-picker so a missing native module doesn't crash
 * the app shell — the user just sees an alert.
 */
async function launchAvatarPicker(navigation: RootStackNavigation): Promise<void> {
  let picker: typeof import('expo-image-picker') | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    picker = require('expo-image-picker');
  } catch {
    Alert.alert('Image picker unavailable', 'Please rebuild the app to enable avatar uploads.');
    return;
  }
  if (!picker) return;

  const perm = await picker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    Alert.alert('Photo access needed', 'Allow photos in Settings to pick an avatar.');
    return;
  }

  const result = await picker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
    selectionLimit: 1,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) return;
  const asset = result.assets[0]!;
  navigation.navigate('AvatarCrop', {
    uri: asset.uri,
    width: asset.width ?? 1024,
    height: asset.height ?? 1024,
  });
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  bannerHeading: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  bannerBody: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
  },
  changeAvatar: {
    color: colors.accentGoldGlow,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  input: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    paddingVertical: 0,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  deleteLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  deleteLinkText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    textDecorationLine: 'underline',
  },
});
