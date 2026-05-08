import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '@/screens/HomeScreen';
import MapScreen from '@/screens/MapScreen';
import GameScreen from '@/screens/GameScreen';
import ResultsScreen from '@/screens/ResultsScreen';
import TimeTrialScreen from '@/screens/TimeTrialScreen';
import TimeTrialGameScreen from '@/screens/TimeTrialGameScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import AuthScreen from '@/screens/AuthScreen';
import EditProfileScreen from '@/screens/EditProfileScreen';
import AvatarCropScreen from '@/screens/AvatarCropScreen';
import FriendsScreen from '@/screens/FriendsScreen';
import FriendProfileScreen from '@/screens/FriendProfileScreen';
import LeaderboardScreen from '@/screens/LeaderboardScreen';
import FriendPickerScreen from '@/screens/FriendPickerScreen';
import ChallengeResultScreen from '@/screens/ChallengeResultScreen';
import MatchmakingScreen from '@/screens/MatchmakingScreen';
import DuelLobbyScreen from '@/screens/DuelLobbyScreen';
import DuelGameScreen from '@/screens/DuelGameScreen';
import DuelResultsScreen from '@/screens/DuelResultsScreen';
import DuelInviteJoinScreen from '@/screens/DuelInviteJoinScreen';
import FriendDuelPickerScreen from '@/screens/FriendDuelPickerScreen';
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
      <Stack.Screen
        name="TimeTrialGame"
        component={TimeTrialGameScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />

      {/* Auth + Profile editing */}
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AvatarCrop"
        component={AvatarCropScreen}
        options={{ animation: 'fade', presentation: 'modal' }}
      />

      {/* Friends + Leaderboards + Challenges */}
      <Stack.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="FriendProfile"
        component={FriendProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="FriendPicker"
        component={FriendPickerScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="ChallengeResult"
        component={ChallengeResultScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />

      {/* Online Duels */}
      <Stack.Screen
        name="Matchmaking"
        component={MatchmakingScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="DuelLobby"
        component={DuelLobbyScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="DuelGame"
        component={DuelGameScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="DuelResults"
        component={DuelResultsScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="DuelInviteJoin"
        component={DuelInviteJoinScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="FriendDuelPicker"
        component={FriendDuelPickerScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
