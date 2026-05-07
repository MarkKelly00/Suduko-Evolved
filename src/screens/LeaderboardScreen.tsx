import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { TopBar } from '@/components/ui/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
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
import { leaderboardService } from '@/services/supabase';
import { colors, fontSize, fontWeight, spacing } from '@/theme';
import type {
  LeaderboardScope,
  RootRouteProp,
} from '@/app/navigation/routes';

type Tab = LeaderboardScope;

const TIME_TRIAL_MODES = [
  { id: 'sprint-3min', label: '3-Minute Sprint' },
  { id: 'daily-sprint', label: 'Daily Sprint' },
];

export default function LeaderboardScreen() {
  const route = useRoute<RootRouteProp<'Leaderboard'>>();
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
      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <GlassCard>
            <Text style={styles.emptyTitle}>
              {emptyTitleFor(activeTab, filter)}
            </Text>
            <Text style={styles.emptyBody}>{emptyBodyFor(activeTab, filter)}</Text>
          </GlassCard>
        </View>
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
              onChallenge={
                activeTab === 'friends' && me && item.userId !== me.id
                  ? () =>
                      Alert.alert(
                        'Coming soon',
                        'Direct challenges from leaderboards land in Phase 7.',
                      )
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

function emptyTitleFor(tab: Tab, filter: LeaderboardFilterState): string {
  if (tab === 'friends') return 'No friends here yet';
  if (filter.mode === 'campaign-level') return 'No scores yet for this level';
  return 'No scores yet for this mode';
}
function emptyBodyFor(tab: Tab, _filter: LeaderboardFilterState): string {
  if (tab === 'friends') return 'Add friends and complete a level together to populate this list.';
  return 'Be the first to set a score!';
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxxl,
  },
});
