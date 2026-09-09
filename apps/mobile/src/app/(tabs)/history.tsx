import { formatRelativeTime, type SearchRow } from '@recs/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ChevronRightIcon, TrashIcon } from '@/components/Icons';
import { deleteSearch, fetchRecentSearches } from '@/lib/queries';
import { fontSize, radius, spacing, useTheme } from '@/lib/theme';

export default function HistoryScreen() {
  const colors = useTheme();
  const router = useRouter();

  const [searches, setSearches] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSearches(await fetchRecentSearches(100));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch on focus so a search run on the Search tab shows up here.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function remove(id: string) {
    // Optimistic: drop it immediately, restore on failure.
    const previous = searches;
    setSearches((rows) => rows.filter((row) => row.id !== id));
    try {
      await deleteSearch(id);
    } catch {
      setSearches(previous);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      data={searches}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={colors.accent}
        />
      }
      ListHeaderComponent={
        error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerSubtle }]}>
            <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>{error}</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            Your searches will appear here once you have run one.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Pressable
            onPress={() => router.push(`/results/${item.id}`)}
            style={styles.rowMain}
            accessibilityRole="button"
          >
            <Text numberOfLines={2} style={[styles.query, { color: colors.text }]}>
              {item.raw_query}
            </Text>

            {item.expanded_query?.keywords && (
              <Text numberOfLines={1} style={[styles.keywords, { color: colors.textSubtle }]}>
                → {item.expanded_query.keywords}
              </Text>
            )}

            <Text style={[styles.meta, { color: colors.textSubtle }]}>
              {formatRelativeTime(item.created_at)} ·{' '}
              {item.scored_count === 0
                ? 'no matches'
                : `${item.scored_count} recommendation${item.scored_count === 1 ? '' : 's'}`}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void remove(item.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Delete search: ${item.raw_query}`}
            style={styles.iconButton}
          >
            <TrashIcon color={colors.textSubtle} size={18} />
          </Pressable>

          <ChevronRightIcon color={colors.textSubtle} size={18} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[10] },
  errorBox: { padding: spacing[3], borderRadius: radius.md, marginBottom: spacing[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  rowMain: { flex: 1, gap: 3 },
  query: { fontSize: fontSize.base, fontWeight: '500', lineHeight: 21 },
  keywords: { fontSize: fontSize.xs, fontFamily: 'monospace' },
  meta: { fontSize: fontSize.xs, fontVariant: ['tabular-nums'], marginTop: 2 },
  iconButton: { padding: spacing[1] },
  empty: { alignItems: 'center', paddingVertical: spacing[16], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600' },
  emptyBody: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
});
