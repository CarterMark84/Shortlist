import { formatPrice, type DisplayProduct, type SearchRow } from '@recs/shared';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { fetchResults, fetchSavedAsins, fetchSearch } from '@/lib/queries';
import { fontSize, radius, spacing, useTheme } from '@/lib/theme';

export default function ResultsScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [search, setSearch] = useState<SearchRow | null>(null);
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [savedAsins, setSavedAsins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [searchRow, results, saved] = await Promise.all([
        fetchSearch(id),
        fetchResults(id),
        fetchSavedAsins(),
      ]);
      setSearch(searchRow);
      setProducts(results);
      setSavedAsins(saved);
      setError(searchRow ? null : 'That search could not be found.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load recommendations.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Refetch on focus rather than on mount, so returning from another tab
  // picks up newly saved/unsaved products. Matches the other screens.
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

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.danger, fontSize: fontSize.base, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  const expanded = search?.expanded_query;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      data={products}
      keyExtractor={(item) => item.asin}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.label, { color: colors.textSubtle }]}>YOU ASKED FOR</Text>
          <Text style={[styles.query, { color: colors.text }]}>{search?.raw_query}</Text>

          {/* Shown so a poor result set can be traced to a bad reading of the
              request rather than a bad search. */}
          {expanded?.interpretation && (
            <View
              style={[
                styles.interpretation,
                { backgroundColor: colors.accentSubtle, borderColor: colors.accentBorder },
              ]}
            >
              <Text style={[styles.label, { color: colors.accent }]}>UNDERSTOOD AS</Text>
              <Text style={[styles.interpretationText, { color: colors.text }]}>
                {expanded.interpretation}
              </Text>

              {expanded.keywords && (
                <Text style={[styles.detailRow, { color: colors.textMuted }]}>
                  Searched Amazon for{' '}
                  <Text style={{ color: colors.text, fontFamily: 'monospace' }}>
                    {expanded.keywords}
                  </Text>
                </Text>
              )}

              {expanded.mustHave && expanded.mustHave.length > 0 && (
                <Text style={[styles.detailRow, { color: colors.textMuted }]}>
                  Must have{' '}
                  <Text style={{ color: colors.text }}>{expanded.mustHave.join(', ')}</Text>
                </Text>
              )}

              {(expanded.budgetMinCents != null || expanded.budgetMaxCents != null) && (
                <Text style={[styles.detailRow, { color: colors.textMuted }]}>
                  Budget{' '}
                  <Text style={{ color: colors.text }}>
                    {expanded.budgetMinCents != null && expanded.budgetMaxCents != null
                      ? `${formatPrice(expanded.budgetMinCents)} – ${formatPrice(expanded.budgetMaxCents)}`
                      : expanded.budgetMaxCents != null
                        ? `up to ${formatPrice(expanded.budgetMaxCents)}`
                        : `from ${formatPrice(expanded.budgetMinCents ?? 0)}`}
                  </Text>
                </Text>
              )}
            </View>
          )}

          <Text style={[styles.meta, { color: colors.textSubtle }]}>
            {products.length > 0
              ? `Top ${products.length} of ${search?.candidate_count ?? 0} candidates considered`
              : `${search?.candidate_count ?? 0} candidates considered`}
            {search?.provider === 'fixtures' ? ' · offline sample data' : ''}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View
          style={[
            styles.empty,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No recommendations for this one
          </Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            {search?.candidate_count === 0
              ? 'Amazon returned no products for those search terms. Try a more common name for the product.'
              : `We looked at ${search?.candidate_count ?? 0} products, but none cleared the quality bar (at least 10 reviews and a 3-star rating). Try broadening the description.`}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <ProductCard product={item} initiallySaved={savedAsins.has(item.asin)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  header: { gap: spacing[3] },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  query: { fontSize: fontSize['2xl'], fontWeight: '600', lineHeight: 30, letterSpacing: -0.4 },
  interpretation: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  interpretationText: { fontSize: fontSize.base, lineHeight: 23 },
  detailRow: { fontSize: fontSize.sm, lineHeight: 20 },
  meta: { fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  empty: { borderWidth: 1, borderRadius: radius.lg, padding: spacing[6], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', textAlign: 'center' },
  emptyBody: { fontSize: fontSize.sm, lineHeight: 20, textAlign: 'center' },
});
