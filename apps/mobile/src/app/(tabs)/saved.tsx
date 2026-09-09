import { formatRelativeTime } from '@recs/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { fetchSaved, type SavedEntry } from '@/lib/queries';
import { fontSize, radius, spacing, useTheme } from '@/lib/theme';

export default function SavedScreen() {
  const colors = useTheme();

  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await fetchSaved());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load saved products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
      data={entries}
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
        <View style={styles.header}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerSubtle }]}>
              <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>{error}</Text>
            </View>
          ) : entries.length > 0 ? (
            <Text style={[styles.note, { color: colors.textMuted }]}>
              Prices and ratings are as they were when you saved each item.
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved products</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            Use Save on any recommendation to keep it here for later.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={[styles.savedAt, { color: colors.textSubtle }]}>
            Saved {formatRelativeTime(item.savedAt)}
          </Text>
          <ProductCard product={item.product} initiallySaved />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  header: { gap: spacing[2] },
  note: { fontSize: fontSize.sm, lineHeight: 20 },
  errorBox: { padding: spacing[3], borderRadius: radius.md },
  item: { gap: spacing[1] },
  savedAt: { fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', paddingVertical: spacing[16], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600' },
  emptyBody: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
});
