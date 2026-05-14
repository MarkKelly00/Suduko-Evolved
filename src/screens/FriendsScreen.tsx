import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FriendListItem } from '@/components/friends/FriendListItem';
import { ChallengeCard, type ChallengeCardStatus } from '@/components/friends/ChallengeCard';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuthStore } from '@/game/state/useAuthStore';
import {
  challengeService,
  friendService,
  profileService,
  type Profile,
  type Challenge,
  type Friendship,
} from '@/services/supabase';
import { duelService, type DuelRoomBundle } from '@/services/duel';
import { getTimeTrialMode } from '@/game/modes/timeTrial';
import {
  colors,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '@/theme';
import type { FriendsTab, RootRouteProp, RootStackNavigation } from '@/app/navigation/routes';
import { maybePromptForPush } from '@/services/notifications/justInTimePrompt';

interface FriendRow {
  friendship: Friendship;
  profile: Profile;
}

interface PendingRequest {
  friendship: Friendship;
  profile: Profile;
}

interface ChallengeRow {
  challenge: Challenge;
  challenger: Profile | null;
  opponent: Profile | null;
}

export default function FriendsScreen() {
  const route = useRoute<RootRouteProp<'Friends'>>();
  const navigation = useNavigation<RootStackNavigation>();
  const me = useAuthStore((s) => s.profile);

  const [activeTab, setActiveTab] = useState<FriendsTab>(
    route.params?.initialTab ?? 'friends',
  );
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<PendingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<PendingRequest[]>([]);
  const [challengesInbox, setChallengesInbox] = useState<ChallengeRow[]>([]);
  const [challengesOutgoing, setChallengesOutgoing] = useState<ChallengeRow[]>([]);
  const [challengesCompleted, setChallengesCompleted] = useState<ChallengeRow[]>([]);
  /** Recent completed duels — surfaced under the "Duels" sub-filter of
   *  the Challenges tab so users can review past duels alongside
   *  level-challenge results. */
  const [recentDuels, setRecentDuels] = useState<DuelRoomBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!me) return;
    const [
      friendsList,
      incomingList,
      outgoingList,
      cIn,
      cOut,
      cDone,
      duels,
    ] = await Promise.all([
      friendService.getFriends(me.id),
      friendService.getIncomingRequests(),
      friendService.getOutgoingRequests(),
      challengeService.getInbox(),
      challengeService.getOutgoing(),
      challengeService.getCompleted(5),
      duelService.getRecentDuels(me.id, 8),
    ]);
    setFriends(friendsList);
    setIncoming(incomingList);
    setOutgoing(outgoingList);
    // Hydrate challenge profiles in one pass to keep it tidy.
    const allChallenges = [...cIn, ...cOut, ...cDone];
    const userIds = Array.from(
      new Set(allChallenges.flatMap((c) => [c.challenger_id, c.opponent_id])),
    );
    const profileMap = new Map<string, Profile>();
    await Promise.all(
      userIds.map(async (id) => {
        const p = await profileService.getProfile(id);
        if (p) profileMap.set(id, p);
      }),
    );
    const enrich = (rows: Challenge[]): ChallengeRow[] =>
      rows.map((challenge) => ({
        challenge,
        challenger: profileMap.get(challenge.challenger_id) ?? null,
        opponent: profileMap.get(challenge.opponent_id) ?? null,
      }));
    setChallengesInbox(enrich(cIn));
    setChallengesOutgoing(enrich(cOut));
    setChallengesCompleted(enrich(cDone));
    // Filter to completed duels only — the Duels sub-tab shows results,
    // not lobbies or in-flight rooms. Pre-existing in-flight rooms are
    // surfaced via the relevant lobby / game screens.
    setRecentDuels(duels.filter((d) => d.room.status === 'completed'));
  }, [me]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      refresh().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [refresh]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const tabs = [
    { key: 'friends' as const, label: 'Friends' },
    { key: 'requests' as const, label: 'Requests', badgeCount: incoming.length },
    { key: 'add' as const, label: 'Add' },
    {
      key: 'challenges' as const,
      label: 'Challenges',
      badgeCount: challengesInbox.length,
    },
  ];

  if (!me) {
    return (
      <ScreenBackground>
        <TopBar title="Friends" />
        <View style={styles.empty}>
          <GlassCard>
            <Text style={styles.emptyTitle}>Sign in required</Text>
            <Text style={styles.emptyBody}>Sign in to see your friends.</Text>
          </GlassCard>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <TopBar title="Friends" />
      <SegmentedTabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />
      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      ) : null}
      {activeTab === 'friends' ? (
        <FriendsListTab
          friends={friends}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onPressFriend={(p) => navigation.navigate('FriendProfile', { userId: p.id })}
          onChallenge={(p) => promptChallengeUnsupported(p)}
          onAddFriends={() => setActiveTab('add')}
        />
      ) : null}
      {activeTab === 'requests' ? (
        <RequestsTab
          incoming={incoming}
          outgoing={outgoing}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onAccept={async (id) => {
            await friendService.acceptRequest(id);
            void refresh();
          }}
          onDecline={async (id) => {
            await friendService.declineRequest(id);
            void refresh();
          }}
          onCancel={async (id) => {
            await friendService.cancelRequest(id);
            void refresh();
          }}
        />
      ) : null}
      {activeTab === 'add' ? (
        <AddTab me={me} onChanged={() => void refresh()} />
      ) : null}
      {activeTab === 'challenges' ? (
        <ChallengesTab
          me={me}
          inbox={challengesInbox}
          outgoing={challengesOutgoing}
          completed={challengesCompleted}
          duels={recentDuels}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onPlay={(row) => {
            void playChallenge(row, navigation);
            void refresh();
          }}
          onDecline={async (id) => {
            await challengeService.declineChallenge(id);
            void refresh();
          }}
          onViewResults={(row) => viewChallengeResults(row, me, navigation)}
          onViewDuel={(roomId) =>
            navigation.navigate('DuelResults', { roomId })
          }
          onAddFriends={() => setActiveTab('add')}
        />
      ) : null}
    </ScreenBackground>
  );
}

/* -------------------------------- Tabs -------------------------------- */

function FriendsListTab({
  friends,
  refreshing,
  onRefresh,
  onPressFriend,
  onChallenge,
  onAddFriends,
}: {
  friends: FriendRow[];
  refreshing: boolean;
  onRefresh: () => void;
  onPressFriend: (p: Profile) => void;
  onChallenge: (p: Profile) => void;
  onAddFriends: () => void;
}) {
  if (friends.length === 0) {
    return (
      <View style={styles.empty}>
        <GlassCard>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptyBody}>
            Add a friend by username to start challenging each other.
          </Text>
          <PremiumButton label="Add friends" variant="primary" onPress={onAddFriends} />
        </GlassCard>
      </View>
    );
  }
  return (
    <FlatList
      data={friends}
      keyExtractor={(item) => item.friendship.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl tintColor={colors.textMuted} refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <FriendListItem
          profile={item.profile}
          onPress={() => onPressFriend(item.profile)}
          action={{
            label: 'Challenge',
            onPress: () => onChallenge(item.profile),
            variant: 'ghost',
          }}
        />
      )}
    />
  );
}

function RequestsTab({
  incoming,
  outgoing,
  refreshing,
  onRefresh,
  onAccept,
  onDecline,
  onCancel,
}: {
  incoming: PendingRequest[];
  outgoing: PendingRequest[];
  refreshing: boolean;
  onRefresh: () => void;
  onAccept: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <View style={styles.empty}>
        <GlassCard>
          <Text style={styles.emptyTitle}>No requests</Text>
          <Text style={styles.emptyBody}>Friend requests will show up here.</Text>
        </GlassCard>
      </View>
    );
  }
  return (
    <FlatList
      data={[]}
      keyExtractor={() => 'noop'}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl tintColor={colors.textMuted} refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <View style={styles.section}>
          {incoming.length > 0 ? (
            <View>
              <SectionLabel>Incoming</SectionLabel>
              {incoming.map((req) => (
                <View key={req.friendship.id} style={styles.requestRow}>
                  {/* Accept lives inline on the card so the row has the
                      same left-avatar / right-button visual balance as
                      the Friends list. Decline is a quieter secondary
                      action below — declining is the rarer choice and
                      shouldn't compete visually with Accept. */}
                  <FriendListItem
                    profile={req.profile}
                    action={{
                      label: 'Accept',
                      variant: 'primary',
                      onPress: () => void onAccept(req.friendship.id),
                    }}
                  />
                  <View style={styles.declineRow}>
                    <PremiumButton
                      label="Decline"
                      variant="ghost"
                      compact
                      onPress={() => void onDecline(req.friendship.id)}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {outgoing.length > 0 ? (
            <View>
              <SectionLabel>Outgoing</SectionLabel>
              {outgoing.map((req) => (
                <FriendListItem
                  key={req.friendship.id}
                  profile={req.profile}
                  action={{
                    label: 'Cancel',
                    onPress: () => void onCancel(req.friendship.id),
                    variant: 'ghost',
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>
      }
      renderItem={null}
    />
  );
}

function AddTab({ me, onChanged }: { me: Profile; onChanged: () => void }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);
  const [statuses, setStatuses] = useState<
    Record<string, 'none' | 'pending_in' | 'pending_out' | 'accepted' | 'blocked'>
  >({});

  useEffect(() => {
    let cancelled = false;
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    setBusy(true);
    void (async () => {
      const found = await profileService.searchByUsername(debouncedQuery, 20);
      if (cancelled) return;
      const filtered = found.filter((p) => p.id !== me.id);
      setResults(filtered);
      // Look up friendship status for each result.
      const next: Record<string, 'none' | 'pending_in' | 'pending_out' | 'accepted' | 'blocked'> =
        {};
      await Promise.all(
        filtered.map(async (p) => {
          next[p.id] = await friendService.getFriendshipStatus(p.id);
        }),
      );
      if (cancelled) return;
      setStatuses(next);
      setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, me.id]);

  const handleAdd = async (p: Profile) => {
    try {
      await friendService.sendRequest(p.id);
      setStatuses((prev) => ({ ...prev, [p.id]: 'pending_out' }));
      onChanged();
      // First successful friend-request send → just-in-time push
      // prompt ("We'll let you know when they accept"). The helper
      // is a no-op after the first install-wide ask.
      void maybePromptForPush('send-friend-request');
    } catch (err) {
      Alert.alert(
        'Could not send request',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  };

  const handleAccept = async (p: Profile) => {
    // Find the incoming friendship ID via getFriendshipStatus + lookup.
    // For simplicity, accept by re-fetching incoming requests.
    const incoming = await friendService.getIncomingRequests();
    const match = incoming.find((r) => r.profile.id === p.id);
    if (!match) return;
    await friendService.acceptRequest(match.friendship.id);
    setStatuses((prev) => ({ ...prev, [p.id]: 'accepted' }));
    onChanged();
  };

  return (
    <View style={styles.addBody}>
      <View style={styles.searchBar}>
        <Text style={styles.searchAt}>@</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="username"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
          accessibilityLabel="Search by username"
        />
        {busy ? <ActivityIndicator color={colors.textMuted} /> : null}
      </View>
      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyInline}>
            <Text style={styles.emptyBody}>
              {debouncedQuery.length < 2
                ? 'Search for a friend by their username.'
                : 'No matches.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = statuses[item.id] ?? 'none';
          let action:
            | { label: string; onPress: () => void; variant: 'primary' | 'ghost'; disabled?: boolean }
            | null = null;
          if (status === 'none') {
            action = {
              label: 'Add',
              onPress: () => void handleAdd(item),
              variant: 'primary',
            };
          } else if (status === 'pending_out') {
            action = {
              label: 'Requested',
              onPress: () => undefined,
              variant: 'ghost',
              disabled: true,
            };
          } else if (status === 'pending_in') {
            action = {
              label: 'Accept',
              onPress: () => void handleAccept(item),
              variant: 'primary',
            };
          } else if (status === 'accepted') {
            action = {
              label: 'Friends ✓',
              onPress: () => undefined,
              variant: 'ghost',
              disabled: true,
            };
          } else {
            action = null;
          }
          return <FriendListItem profile={item} action={action} />;
        }}
      />
    </View>
  );
}

type ChallengeKind = 'levels' | 'duels';

function ChallengesTab({
  me,
  inbox,
  outgoing,
  completed,
  duels,
  refreshing,
  onRefresh,
  onPlay,
  onDecline,
  onViewResults,
  onViewDuel,
  onAddFriends,
}: {
  me: Profile;
  inbox: ChallengeRow[];
  outgoing: ChallengeRow[];
  completed: ChallengeRow[];
  duels: DuelRoomBundle[];
  refreshing: boolean;
  onRefresh: () => void;
  onPlay: (row: ChallengeRow) => void;
  onDecline: (id: string) => Promise<void>;
  /** Tapping a completed challenge surfaces its full results screen.
   *  The handler is async because it has to fetch attempts to build
   *  the ChallengeResult navigation payload. */
  onViewResults: (row: ChallengeRow) => Promise<void>;
  /** Navigate to DuelResults for a finished duel. */
  onViewDuel: (roomId: string) => void;
  onAddFriends: () => void;
}) {
  const [kind, setKind] = useState<ChallengeKind>('levels');

  const hasLevelData =
    inbox.length > 0 || outgoing.length > 0 || completed.length > 0;
  const hasDuelData = duels.length > 0;
  const filterItems = [
    { key: 'levels' as const, label: 'Level Challenges' },
    { key: 'duels' as const, label: 'Duels' },
  ];

  // Cold-start empty state: neither levels nor duels have anything.
  if (!hasLevelData && !hasDuelData) {
    return (
      <View style={styles.empty}>
        <GlassCard>
          <Text style={styles.emptyTitle}>No challenges yet</Text>
          <Text style={styles.emptyBody}>
            After you finish a level you can challenge a friend to beat your time.
          </Text>
          <PremiumButton label="Add friends" variant="primary" onPress={onAddFriends} />
        </GlassCard>
      </View>
    );
  }

  return (
    <FlatList
      data={[]}
      keyExtractor={() => 'noop'}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl tintColor={colors.textMuted} refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <View style={styles.section}>
          <View style={styles.kindFilter}>
            <SegmentedControl
              items={filterItems}
              activeKey={kind}
              onChange={(k) => setKind(k)}
            />
          </View>
          {kind === 'levels' ? (
            <LevelChallengesSection
              me={me}
              inbox={inbox}
              outgoing={outgoing}
              completed={completed}
              onPlay={onPlay}
              onDecline={onDecline}
              onViewResults={onViewResults}
            />
          ) : (
            <DuelsSection
              me={me}
              duels={duels}
              onViewDuel={onViewDuel}
            />
          )}
        </View>
      }
      renderItem={null}
    />
  );
}

function LevelChallengesSection({
  me,
  inbox,
  outgoing,
  completed,
  onPlay,
  onDecline,
  onViewResults,
}: {
  me: Profile;
  inbox: ChallengeRow[];
  outgoing: ChallengeRow[];
  completed: ChallengeRow[];
  onPlay: (row: ChallengeRow) => void;
  onDecline: (id: string) => Promise<void>;
  onViewResults: (row: ChallengeRow) => Promise<void>;
}) {
  if (inbox.length === 0 && outgoing.length === 0 && completed.length === 0) {
    return (
      <View style={styles.subEmpty}>
        <Text style={styles.subEmptyText}>
          {'No level challenges yet — clear a level and challenge a friend.'}
        </Text>
      </View>
    );
  }
  return (
    <>
      {inbox.length > 0 ? (
        <View>
          <SectionLabel>Your turn</SectionLabel>
          {inbox.map((row) => (
            <ChallengeCard
              key={row.challenge.id}
              status={row.challenge.status === 'accepted' ? 'incoming-accepted' : 'incoming-pending'}
              challenger={row.challenger}
              opponent={row.opponent}
              modeLabel={modeLabelFor(row.challenge)}
              expiresAt={row.challenge.expires_at}
              primaryLabel="Play"
              secondaryLabel="Decline"
              onPress={() => onPlay(row)}
              onSecondary={() => void onDecline(row.challenge.id)}
            />
          ))}
        </View>
      ) : null}
      {outgoing.length > 0 ? (
        <View>
          <SectionLabel>Waiting on opponent</SectionLabel>
          {outgoing.map((row) => (
            <ChallengeCard
              key={row.challenge.id}
              status="outgoing-pending"
              challenger={row.challenger}
              opponent={row.opponent}
              modeLabel={modeLabelFor(row.challenge)}
              expiresAt={row.challenge.expires_at}
            />
          ))}
        </View>
      ) : null}
      {completed.length > 0 ? (
        <View>
          <SectionLabel>Recent results</SectionLabel>
          {completed.map((row) => (
            <ChallengeCard
              key={row.challenge.id}
              status={
                row.challenge.winner_id == null
                  ? 'completed-draw'
                  : row.challenge.winner_id === me.id
                    ? 'completed-won'
                    : 'completed-lost'
              }
              challenger={row.challenger}
              opponent={row.opponent}
              modeLabel={modeLabelFor(row.challenge)}
              primaryLabel="View results"
              onPress={() => void onViewResults(row)}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

function DuelsSection({
  me,
  duels,
  onViewDuel,
}: {
  me: Profile;
  duels: DuelRoomBundle[];
  onViewDuel: (roomId: string) => void;
}) {
  if (duels.length === 0) {
    return (
      <View style={styles.subEmpty}>
        <Text style={styles.subEmptyText}>
          {'No duels yet — tap Time Trial → Challenge friend or share an invite link.'}
        </Text>
      </View>
    );
  }
  return (
    <View>
      <SectionLabel>Recent duels</SectionLabel>
      {duels.map((bundle) => {
        const self = bundle.participants.find((p) => p.user_id === me.id);
        const opp = bundle.participants.find((p) => p.user_id !== me.id);
        const challenger = self?.profile ?? null;
        const opponent = opp?.profile ?? null;
        const winnerId = bundle.room.winner_id;
        const status: ChallengeCardStatus =
          winnerId == null
            ? 'completed-draw'
            : winnerId === me.id
              ? 'completed-won'
              : 'completed-lost';
        // Friendly mode label: time-trial modes have a `name` we
        // can surface; fall back to the raw mode id otherwise.
        const meta = getTimeTrialMode(bundle.room.mode);
        const modeLabel = meta?.name ?? bundle.room.mode;
        return (
          <ChallengeCard
            key={bundle.room.id}
            status={status}
            challenger={challenger}
            opponent={opponent}
            modeLabel={modeLabel}
            primaryLabel="View results"
            onPress={() => onViewDuel(bundle.room.id)}
          />
        );
      })}
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{String(children).toUpperCase()}</Text>;
}

function modeLabelFor(c: Challenge): string {
  if (c.mode === 'campaign' && c.level_id) return `Level: ${c.level_id}`;
  if (c.mode === 'sprint' && c.sprint_mode_id) return `Time Trial: ${c.sprint_mode_id}`;
  return c.mode;
}

function promptChallengeUnsupported(_p: Profile) {
  Alert.alert(
    'Pick a level first',
    'Finish a level to challenge a friend with that puzzle, or open a level from the Map.',
  );
}

async function playChallenge(
  row: ChallengeRow,
  navigation: RootStackNavigation,
): Promise<void> {
  try {
    return await playChallengeInner(row, navigation);
  } catch (err) {
    if (__DEV__) console.warn('[playChallenge] failed:', err);
    Alert.alert(
      'Could not open challenge',
      err instanceof Error
        ? err.message
        : 'Something went wrong opening that challenge. Try again in a moment.',
    );
  }
}

async function playChallengeInner(
  row: ChallengeRow,
  navigation: RootStackNavigation,
): Promise<void> {
  const { challenge, challenger } = row;
  // Look up the challenger's attempt for the in-game banner.
  const attempts = await challengeService.getChallengeAttempts(challenge.id);
  const challengerAttempt = attempts.find((a) => a.user_id === challenge.challenger_id);
  if (!challengerAttempt) {
    Alert.alert(
      'Challenge unavailable',
      'The challenger has not posted their score yet.',
    );
    return;
  }

  const challengeContext = {
    challengeId: challenge.id,
    challengerId: challenge.challenger_id,
    challengerName: challenger?.display_name ?? challenger?.username ?? 'Friend',
    challengerAvatarUrl: challenger?.avatar_url ?? null,
    challengerScore: challengerAttempt.score,
    challengerTimeSeconds: Math.round(challengerAttempt.time_ms / 1000),
    challengerMistakes: challengerAttempt.mistakes,
    challengerHints: challengerAttempt.hints,
    puzzleSeed: challenge.puzzle_seed,
  };

  // Mark accepted (fire-and-forget) so the inbox UI updates promptly.
  void challengeService.markAcceptedOnPlayStart(challenge.id);

  if (challenge.mode === 'campaign') {
    const level = challenge.level_id
      ? await import('@/game/content/levels').then((m) => m.getLevelById(challenge.level_id!))
      : null;
    if (!level) {
      Alert.alert('Challenge unavailable', 'Could not load that level.');
      return;
    }
    // GameScreen's effect will (re)start the session for this level. Seed
    // determinism guarantees both players see the same puzzle.
    navigation.navigate('Game', {
      levelId: level.id,
      challengeContext,
    });
    return;
  }
  if (challenge.mode === 'sprint' && challenge.sprint_mode_id) {
    // Don't pre-start the session — TimeTrialGameScreen will see
    // challengeContext.puzzleSeed and use it instead of rolling a fresh seed.
    navigation.navigate('TimeTrialGame', {
      modeId: challenge.sprint_mode_id,
      challengeContext,
    });
  }
}

/**
 * Drill into a completed challenge's results screen. Fetches both
 * attempts from `challenge_attempts`, builds the ChallengeResult
 * route payload, and navigates. If either attempt is missing (rare —
 * server only marks a challenge "completed" when both have posted)
 * we surface a friendly alert rather than navigating to an empty
 * results screen.
 */
async function viewChallengeResults(
  row: ChallengeRow,
  me: Profile,
  navigation: RootStackNavigation,
): Promise<void> {
  const { challenge, challenger, opponent } = row;
  const attempts = await challengeService.getChallengeAttempts(challenge.id);
  const myAttempt = attempts.find((a) => a.user_id === me.id);
  const theirAttempt = attempts.find((a) => a.user_id !== me.id);
  if (!myAttempt || !theirAttempt) {
    Alert.alert(
      'Results unavailable',
      'Both players haven’t posted scores for this challenge yet.',
    );
    return;
  }
  const themProfile = theirAttempt.user_id === challenge.challenger_id ? challenger : opponent;
  navigation.navigate('ChallengeResult', {
    challengeId: challenge.id,
    mode: challenge.mode === 'sprint' ? 'sprint' : 'campaign',
    levelId: challenge.level_id ?? challenge.sprint_mode_id ?? '',
    you: {
      userId: me.id,
      name: me.display_name ?? me.username ?? 'You',
      avatarUrl: me.avatar_url,
      score: myAttempt.score,
      timeSeconds: Math.round(myAttempt.time_ms / 1000),
      mistakes: myAttempt.mistakes,
      hints: myAttempt.hints,
      crown: myAttempt.crown ?? false,
    },
    them: {
      userId: theirAttempt.user_id,
      name: themProfile?.display_name ?? themProfile?.username ?? 'Friend',
      avatarUrl: themProfile?.avatar_url ?? null,
      score: theirAttempt.score,
      timeSeconds: Math.round(theirAttempt.time_ms / 1000),
      mistakes: theirAttempt.mistakes,
      hints: theirAttempt.hints,
      crown: theirAttempt.crown ?? false,
    },
    winnerId: challenge.winner_id,
  });
}

// Keep the unused-status type satisfied (kept for completeness).
const _supportedStatuses: ChallengeCardStatus[] = [
  'incoming-pending',
  'incoming-accepted',
  'outgoing-pending',
  'completed-won',
  'completed-lost',
  'completed-draw',
  'expired',
];
void _supportedStatuses;

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.base,
  },
  emptyInline: {
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
    marginBottom: spacing.base,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  section: {
    gap: spacing.base,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wider,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  kindFilter: {
    // SegmentedControl already applies horizontal padding via its
    // own `outer` wrapper, but its lg-sized padding mirrors the
    // SegmentedTabs above. Cancel that out + give the control a
    // small vertical breathing room below the gold underline.
    marginHorizontal: -spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  subEmpty: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
  },
  subEmptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.4,
  },
  requestRow: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  declineRow: {
    // Right-align the Decline so the visual flow reads as:
    //   "Accept is your primary action; Decline is here if you need it."
    // Bottom-margin small because the row is followed by the next
    // request — uniform vertical rhythm across the list.
    alignItems: 'flex-end',
    paddingRight: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
  },
  searchAt: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    paddingVertical: 0,
  },
  addBody: {
    flex: 1,
  },
});
