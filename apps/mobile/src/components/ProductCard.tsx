import { formatPercent, formatPrice, WEIGHTS, type DisplayProduct } from '@recs/shared';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { elevation, fontSize, radius, spacing, useTheme } from '@/lib/theme';
import { setSaved } from '@/lib/queries';
import { StarRating } from './StarRating';

/**
 * A single recommendation.
 *
 * Mirrors the web card's information hierarchy — rank, image, title, rating,
 * price, then the actions — laid out for a narrow screen.
 */
export function ProductCard({
  product,
  initiallySaved,
}: {
  product: DisplayProduct;
  initiallySaved: boolean;
}) {
  const colors = useTheme();
  const [saved, setSavedState] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const isTop = product.rank === 1;

  async function open() {
    await WebBrowser.openBrowserAsync(product.productUrl);
  }

  async function toggleSaved() {
    const next = !saved;
    setSavedState(next);
    setBusy(true);
    try {
      await setSaved(product, next);
    } catch {
      setSavedState(!next); // roll back
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={[
        styles.card,
        elevation.card,
        {
          backgroundColor: colors.surface,
          borderColor: isTop ? colors.accentBorder : colors.border,
        },
      ]}
    >
      {isTop && (
        <View style={[styles.bestBadge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.bestBadgeText, { color: colors.onAccent }]}>BEST MATCH</Text>
        </View>
      )}

      <View style={styles.body}>
        <Pressable onPress={open} style={styles.imageWrap} accessibilityRole="imagebutton">
          <View style={[styles.imageBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            {product.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.image}
                contentFit="contain"
                transition={150}
              />
            ) : (
              <Text style={{ color: colors.textSubtle, fontSize: fontSize.xs }}>No image</Text>
            )}
          </View>

          {product.rank !== null && (
            <View
              style={[
                styles.rankBadge,
                {
                  backgroundColor: isTop ? colors.accent : colors.surface,
                  borderColor: isTop ? colors.accent : colors.borderStrong,
                },
              ]}
            >
              <Text
                style={[
                  styles.rankText,
                  { color: isTop ? colors.onAccent : colors.textMuted },
                ]}
              >
                {product.rank}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.details}>
          <Pressable onPress={open} accessibilityRole="link">
            <Text
              numberOfLines={3}
              style={[styles.title, { color: colors.text, fontSize: fontSize.base }]}
            >
              {product.title}
            </Text>
          </Pressable>

          <View style={styles.ratingRow}>
            <StarRating rating={product.rating} reviewCount={product.reviewCount} compact />
          </View>

          <Text style={[styles.price, { color: colors.text }]}>
            {formatPrice(product.priceCents, product.currency)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: pressed ? colors.accentPressed : colors.accent },
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: colors.onAccent }]}>
            View on Amazon
          </Text>
        </Pressable>

        <Pressable
          onPress={toggleSaved}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          style={[
            styles.secondaryButton,
            {
              backgroundColor: saved ? colors.accentSubtle : colors.surface,
              borderColor: saved ? colors.accentBorder : colors.border,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              { color: saved ? colors.accent : colors.textMuted },
            ]}
          >
            {saved ? 'Saved' : 'Save'}
          </Text>
        </Pressable>
      </View>

      {product.breakdown && product.score !== null && (
        <View style={[styles.breakdownWrap, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => setShowBreakdown((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showBreakdown }}
          >
            <Text style={[styles.disclosure, { color: colors.textMuted, fontSize: fontSize.sm }]}>
              {showBreakdown ? '▾' : '▸'} Why this ranked{' '}
              {product.rank !== null ? `#${product.rank}` : 'here'}
            </Text>
          </Pressable>

          {showBreakdown && (
            <View style={styles.signals}>
              {(
                [
                  ['Relevance', product.breakdown.relevance, WEIGHTS.relevance],
                  ['Customer rating', product.breakdown.ratingComponent, WEIGHTS.rating],
                  ['Number of reviews', product.breakdown.reviewVolume, WEIGHTS.reviewVolume],
                  ['Price', product.breakdown.priceValue, WEIGHTS.priceValue],
                ] as const
              ).map(([label, raw, weight]) => (
                <View key={label} style={styles.signal}>
                  <View style={styles.signalHeader}>
                    <Text style={[styles.signalLabel, { color: colors.text }]}>{label}</Text>
                    <Text style={[styles.signalValue, { color: colors.textMuted }]}>
                      {formatPercent(raw)} × {formatPercent(weight)}
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.fill,
                        { backgroundColor: colors.accent, width: `${Math.max(1, raw * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}

              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.signalLabel, { color: colors.text }]}>Overall score</Text>
                <Text style={[styles.signalLabel, { color: colors.text }]}>
                  {formatPercent(product.score)}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  bestBadge: {
    position: 'absolute',
    top: -10,
    left: spacing[4],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
    zIndex: 1,
  },
  bestBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  body: { flexDirection: 'row', gap: spacing[4] },
  imageWrap: { position: 'relative' },
  imageBox: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  rankBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: fontSize.xs, fontWeight: '700' },
  details: { flex: 1, gap: spacing[2] },
  title: { fontWeight: '500', lineHeight: 21 },
  ratingRow: { flexDirection: 'row' },
  price: {
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  actions: { flexDirection: 'row', gap: spacing[2] },
  primaryButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: fontSize.sm, fontWeight: '600' },
  secondaryButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: fontSize.sm, fontWeight: '600' },
  breakdownWrap: { borderTopWidth: 1, paddingTop: spacing[3] },
  disclosure: { fontWeight: '500' },
  signals: { marginTop: spacing[3], gap: spacing[3] },
  signal: { gap: spacing[1] },
  signalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  signalLabel: { fontSize: fontSize.sm, fontWeight: '500' },
  signalValue: { fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: spacing[3],
  },
});
