import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '@/screens/HomeScreen';
import MapScreen from '@/screens/MapScreen';
import GameScreen from '@/screens/GameScreen';
import ResultsScreen from '@/screens/ResultsScreen';
import TimeTrialScreen from '@/screens/TimeTrialScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import type { RootStackParamList } from './routes';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen name="TimeTrial" component={TimeTrialScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
