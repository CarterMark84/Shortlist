import { formatRating, formatReviewCount, starFills } from '@recs/shared';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, ClipPath, Path, Rect } from 'react-native-svg';

import { fontSize, useTheme } from '@/lib/theme';

const STAR_PATH =
  'M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45L2.6 9.45l6.5-.95z';

/**
 * Star rating with true fractional fills, matching the web component exactly
 * (same `starFills` helper, same geometry).
 */
export function StarRating({
  rating,
  reviewCount,
  size = 14,
  compact = false,
}: {
  rating: number | null;
  reviewCount: number;
  size?: number;
  compact?: boolean;
}) {
  const colors = useTheme();
  const fills = starFills(rating);

  const label =
    rating === null
      ? 'No customer rating yet'
      : `${formatRating(rating)} out of 5 stars from ${formatReviewCount(reviewCount)} reviews`;

  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      <View style={styles.stars}>
        {fills.map((fill, index) => (
          <Star
            key={index}
            fill={fill}
            size={size}
            filledColor={colors.star}
            emptyColor={colors.starEmpty}
            clipId={`m-star-${index}-${Math.round(fill * 100)}`}
          />
        ))}
      </View>

      <Text style={[styles.value, { color: colors.text, fontSize: fontSize.sm }]}>
        {formatRating(rating)}
      </Text>

      <Text style={[styles.count, { color: colors.textMuted, fontSize: fontSize.sm }]}>
        {compact
          ? `(${formatReviewCount(reviewCount)})`
          : `· ${formatReviewCount(reviewCount)} reviews`}
      </Text>
    </View>
  );
}

function Star({
  fill,
  size,
  filledColor,
  emptyColor,
  clipId,
}: {
  fill: number;
  size: number;
  filledColor: string;
  emptyColor: string;
  clipId: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR_PATH} fill={emptyColor} />
      {fill > 0 && (
        <>
          <Defs>
            <ClipPath id={clipId}>
              <Rect x="0" y="0" width={24 * fill} height="24" />
            </ClipPath>
          </Defs>
          <Path d={STAR_PATH} fill={filledColor} clipPath={`url(#${clipId})`} />
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  value: { fontWeight: '600' },
  count: { fontVariant: ['tabular-nums'] },
});
