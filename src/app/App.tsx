import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { setStorage } from '@/services/persistence/storage';
import { MMKVStorage } from '@/services/persistence/mmkvStorage';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { useProgressStore } from '@/game/state/useProgressStore';
import { audioService } from '@/services/audio/audioService';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { colors } from '@/theme';

export default function App() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wire up MMKV-backed storage and hydrate persistent stores. We do this
    // synchronously before painting the navigator so screens can read from
    // the stores without a flash of empty state.
    setStorage(new MMKVStorage());
    useSettingsStore.getState().hydrate();
    useProgressStore.getState().hydrate();
    void audioService.preloadSfx();
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  const navTheme = {
    ...DarkTheme,
    dark: true,
    colors: {
      ...DarkTheme.colors,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.divider,
      primary: colors.accentGold,
      notification: colors.accentGold,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
