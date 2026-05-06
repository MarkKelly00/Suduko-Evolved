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
}

export type RootStackParamList = {
  Home: undefined;
  Map: undefined;
  Game: { levelId: string };
  Results: ResultsRouteParams;
  TimeTrial: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type RootStackNavigation = NativeStackNavigationProp<RootStackParamList>;

export type RootRouteProp<RouteName extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  RouteName
>;
