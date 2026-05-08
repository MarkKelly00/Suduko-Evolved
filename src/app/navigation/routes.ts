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
  /** Set when the just-played session was a friend challenge — Results
   *  branches into the "submit opponent attempt" path on receipt. */
  challengeContext?: ChallengeContext;
}

/**
 * Carried into Game / TimeTrialGame / Results when an opponent is playing
 * an incoming challenge. None of the fields are required for guest play.
 */
export interface ChallengeContext {
  challengeId: string;
  challengerId: string;
  challengerName: string;
  challengerAvatarUrl?: string | null;
  challengerScore: number;
  challengerTimeSeconds: number;
  challengerMistakes: number;
  challengerHints: number;
  /** Required for sprint challenges so we use the same puzzle seed as the
   *  challenger. Campaign challenges resolve the seed from the level. */
  puzzleSeed?: string;
}

export interface ChallengeFromResult {
  mode: 'campaign' | 'sprint';
  levelId: string;
  puzzleSeed: string;
  sprintModeId?: string | null;
  challengerAttempt: {
    score: number;
    timeSeconds: number;
    mistakes: number;
    hints: number;
    stars: 1 | 2 | 3;
    crown: boolean;
  };
}

export interface ChallengeResultRouteParams {
  challengeId: string;
  mode: 'campaign' | 'sprint';
  levelId: string;
  you: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    score: number;
    timeSeconds: number;
    mistakes: number;
    hints: number;
    crown: boolean;
  };
  them: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    score: number;
    timeSeconds: number;
    mistakes: number;
    hints: number;
    crown: boolean;
  };
  winnerId: string | null;
}

export type FriendsTab = 'friends' | 'requests' | 'add' | 'challenges';

export type LeaderboardScope = 'friends' | 'global';
export type LeaderboardMode = 'campaign-level' | 'time-trial';
export type LeaderboardPeriod = 'all-time' | 'week' | 'today';

export type RootStackParamList = {
  Home: undefined;
  Map: undefined;
  Game: { levelId: string; challengeContext?: ChallengeContext };
  Results: ResultsRouteParams;
  TimeTrial: undefined;
  TimeTrialGame: { modeId: string; challengeContext?: ChallengeContext };
  Profile: undefined;
  Settings: undefined;

  Auth: { contextSubtitle?: string } | undefined;
  EditProfile: undefined;
  AvatarCrop: { uri: string; width: number; height: number };

  Friends: { initialTab?: FriendsTab } | undefined;
  FriendProfile: { userId: string };
  Leaderboard:
    | {
        mode?: LeaderboardMode;
        levelId?: string;
        timeTrialMode?: string;
        period?: LeaderboardPeriod;
        scope?: LeaderboardScope;
      }
    | undefined;

  FriendPicker: ChallengeFromResult;
  ChallengeResult: ChallengeResultRouteParams;

  // ----- Online Duels --------------------------------------------------
  Matchmaking: { mode: string };
  /** Pre-game lobby — server start_at drives the countdown. */
  DuelLobby: {
    roomId: string;
    puzzleSeed: string;
    mode: string;
    startAt: string;
  };
  /** Live duel — same-seed race with opponent rail. */
  DuelGame: {
    roomId: string;
    puzzleSeed: string;
    mode: string;
  };
  /** Post-duel comparison + rematch / share / add friend. */
  DuelResults: { roomId: string };
  /** Universal-link entry. AuthGate first if needed. */
  DuelInviteJoin: { inviteCode: string };
  /** Pick a friend to challenge (online-first). */
  FriendDuelPicker: { mode: string };
};

export type RootStackNavigation = NativeStackNavigationProp<RootStackParamList>;

export type RootRouteProp<RouteName extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  RouteName
>;
