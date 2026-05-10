import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import {
  LeaderboardFilterBar,
  type LeaderboardFilterState,
} from '@/components/leaderboards/LeaderboardFilterBar';
import {
  LeaderboardRow,
  type LeaderboardRowData,
} from '@/components/leaderboards/LeaderboardRow';
import { useAuthStore } from '@/game/state/useAuthStore';
import { useProgressStore } from '@/game/state/useProgressStore';
import { useSettingsStore } from '@/game/state/useSettingsStore';
import { leaderboardService } from '@/services/supabase';
import {
  GAME_CENTER_LEADERBOARDS,
  gameCenterService,
  isPlatformIOS,
} from '@/services/gameCenter';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
} from '@/theme';
import type {
  LeaderboardScope,
  RootStackNavigation,
  RootRouteProp,
} from '@/app/navigation/routes';

type Tab = LeaderboardScope;

const TIME_TRIAL_MODES = [
  { id: 'sprint-3min', label: '3-Minute Sprint' },
  { id: 'daily-sprint', label: 'Daily Sprint' },
];

export default function LeaderboardScreen() {
  const route = useRoute<RootRouteProp<'Leaderboard'>>();
  const navigation = useNavigation<RootStackNavigation>();
  const me = useAuthStore((s) => s.profile);
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds);

  const campaignLevels = useMemo(
    () =>
      completedLevelIds.map((id) => ({
        id,
        label: id.replace('world1-level-', 'L'),
      })),
    [completedLevelIds],
  );

  const [activeTab, setActiveTab] = useState<Tab>(route.params?.scope ?? 'global');
  const [filter, setFilter] = useState<LeaderboardFilterState>({
    mode: route.params?.mode ?? 'campaign-level',
    levelId: route.params?.levelId ?? campaignLevels[0]?.id,
    timeTrialMode: route.params?.timeTrialMode ?? 'sprint-3min',
    period: route.params?.period ?? 'all-time',
  });

  const [rows, setRows] = useState<LeaderboardRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRows = useCallback(async () => {
    if (filter.mode === 'campaign-level') {
      if (!filter.levelId) {
        setRows([]);
        return;
      }
      const data =
        activeTab === 'global'
          ? await leaderboardService.getGlobalLeaderboard(filter.levelId, 50)
          : me
            ? await leaderboardService.getFriendLeaderboard(me.id, filter.levelId, 50)
            : [];
      setRows(
        data.map((r) => ({
          rank: r.rank,
          userId: r.user_id,
          username: r.username,
          displayName: r.display_name,
          avatarUrl: r.avatar_url,
          score: r.score,
          timeMs: r.time_ms,
          crown: r.crown,
        })),
      );
    } else {
      if (!filter.timeTrialMode) {
        setRows([]);
        return;
      }
      const periodKey = ''; // MVP: only all-time pulled from server.
      const data = await leaderboardService.getTimeTrialLeaderboard(
        filter.timeTrialMode,
        periodKey,
        50,
      );
      // Friends scope: filter to ids the user is friends with.
      const filtered =
        activeTab === 'friends' && me
          ? await filterToFriends(me.id, data)
          : data;
      setRows(
        filtered.map((r) => ({
          rank: r.rank,
          userId: r.user_id,
          username: r.username,
          displayName: r.display_name,
          avatarUrl: r.avatar_url,
          score: r.score,
          timeMs: r.time_ms,
          crown: false,
        })),
      );
    }
  }, [activeTab, filter, me]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRows().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchRows]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRows();
    } finally {
      setRefreshing(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'friends', label: 'Friends' },
    { key: 'global', label: 'Global' },
  ];

  // Game Center "View in Game Center" CTA — iOS only, opt-in only,
  // and only after the local player is authenticated. Maps the
  // current filter to the closest matching GC leaderboard so taps
  // open relevant data. Sprint filters → SPRINT_3MIN_SCORE; other
  // filters fall through to the dashboard.
  const gameCenterOptIn = useSettingsStore((s) => s.gameCenterOptIn);
  const [gcAuthed, setGcAuthed] = useState(false);
  useEffect(() => {
    if (!isPlatformIOS() || !gameCenterOptIn) {
      setGcAuthed(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const authed = await gameCenterService.isAuthenticated();
      if (!cancelled) setGcAuthed(authed);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameCenterOptIn]);

  const handleViewInGameCenter = () => {
    const id =
      filter.mode === 'time-trial' && filter.timeTrialMode === 'sprint-3min'
        ? GAME_CENTER_LEADERBOARDS.SPRINT_3MIN_SCORE
        : undefined;
    void gameCenterService.showLeaderboard(id);
  };

  return (
    <ScreenBackground>
      <TopBar title="Leaderboard" />
      <SegmentedTabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />
      <LeaderboardFilterBar
        state={filter}
        campaignLevels={campaignLevels}
        timeTrialModes={TIME_TRIAL_MODES}
        onChange={setFilter}
      />
      {gcAuthed ? (
        <View style={styles.gcCtaRow}>
          <PremiumButton
            label="View in Game Center"
            variant="ghost"
            compact
            onPress={handleViewInGameCenter}
          />
        </View>
      ) : null}
      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState tab={activeTab} filter={filter} navigation={navigation} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => `${r.userId}:${r.rank}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              tintColor={colors.textMuted}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          renderItem={({ item }) => (
            <LeaderboardRow
              row={item}
              isCurrentUser={me != null && item.userId === me.id}
              onPress={() =>
                me && item.userId !== me.id
                  ? navigation.navigate('FriendProfile', { userId: item.userId })
                  : undefined
              }
              onChallenge={
                activeTab === 'friends' && me && item.userId !== me.id
                  ? () => navigation.navigate('FriendProfile', { userId: item.userId })
                  : undefined
              }
            />
          )}
        />
      )}
    </ScreenBackground>
  );
}

async function filterToFriends<T extends { user_id: string }>(
  selfId: string,
  rows: T[],
): Promise<T[]> {
  // Use the friend leaderboard view as the source of truth for "is this a friend"
  // — but TT leaderboard only exposes user_id, so we'd need a separate friend
  // graph fetch. For MVP we keep it simple: filter against current friends list.
  const { friendService } = await import('@/services/supabase');
  const friends = await friendService.getFriends(selfId);
  const friendIds = new Set([selfId, ...friends.map((f) => f.profile.id)]);
  return rows.filter((r) => friendIds.has(r.user_id));
}

interface EmptyStateProps {
  tab: Tab;
  filter: LeaderboardFilterState;
  navigation: RootStackNavigation;
}

function EmptyState({ tab, filter, navigation }: EmptyStateProps) {
  const isCampaign = filter.mode === 'campaign-level';
  const headline =
    tab === 'friends'
      ? 'No friends here yet'
      : isCampaign
        ? 'Be first on this level'
        : 'Be first on this mode';
  const body =
    tab === 'friends'
      ? 'Add a friend and finish a puzzle together to climb this board.'
      : isCampaign
        ? 'Clear this level cleanly to claim the top spot.'
        : 'A fast solve plants your name at the top.';

  const cta =
    tab === 'friends'
      ? { label: 'Find friends', action: () => navigation.navigate('Friends', { initialTab: 'add' }) }
      : isCampaign
        ? { label: 'Open Saga Map', action: () => navigation.navigate('Map') }
        : {
            label:
              filter.timeTrialMode === 'daily-sprint'
                ? 'Run today’s sprint'
                : 'Start a 3-Minute Sprint',
            action: () => navigation.navigate('TimeTrial'),
          };

  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyOrnamentWrap}>
        <View style={styles.emptyOrnamentRing} />
        <View style={styles.emptyOrnamentDisc}>
          <Text style={styles.emptyOrnamentSigil}>1</Text>
        </View>
      </View>
      <Text style={styles.emptyHeadline}>{headline}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      <View style={styles.emptyCtaWrap}>
        <PremiumButton label={cta.label} variant="primary" onPress={cta.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gcCtaRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    alignItems: 'flex-end',
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyOrnamentWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyOrnamentRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(224, 185, 106, 0.25)',
  },
  emptyOrnamentDisc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentGoldGlow,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  emptyOrnamentSigil: {
    color: colors.accentGold,
    fontFamily: fontFamily.display,
    fontSize: 30,
    fontWeight: fontWeight.heavy,
    textShadowColor: colors.accentGoldGlow,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  emptyHeadline: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.45,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.xl,
  },
  emptyCtaWrap: {
    width: '100%',
    maxWidth: 320,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxxl,
  },
});
