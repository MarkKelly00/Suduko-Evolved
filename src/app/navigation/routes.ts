import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

export interface ResultsRouteParams {
  levelId: string;
  score: number;
  stars: 1 | 2 | 3;
  crown: boolean;
  timeSeconds: number;
  mistakes: number;
  hintsUsed: number;
  xp: number;
  /** Source mode — drives Results copy + CTA wording. Defaults to campaign. */
  mode?: 'campaign' | 'sprint';
  /** Sprint-only metadata for friend challenges + leaderboards. */
  sprintModeId?: string;
  sprintSeed?: string;
  /** True iff a sprint completed before the timer expired. */
  sprintCleared?: boolean;
}

export type RootStackParamList = {
  Home: undefined;
  Map: undefined;
  Game: { levelId: string };
  Results: ResultsRouteParams;
  TimeTrial: undefined;
  TimeTrialGame: { modeId: string };
  Profile: undefined;
  Settings: undefined;
};

export type RootStackNavigation = NativeStackNavigationProp<RootStackParamList>;

export type RootRouteProp<RouteName extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  RouteName
>;
