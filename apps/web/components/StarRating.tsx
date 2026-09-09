import { formatRating, formatReviewCount, starFills } from '@recs/shared';

/**
 * Star rating drawn as SVG with true fractional fills, so 4.6 shows as four
 * solid stars and one 60%-filled star rather than being rounded to 4.5.
 *
 * Emoji stars were the easy option but render inconsistently across platforms
 * and cannot show a partial fill.
 */
export function StarRating({
  rating,
  reviewCount,
  size = 16,
  showCount = true,
  compact = false,
}: {
  rating: number | null;
  reviewCount: number;
  size?: number;
  showCount?: boolean;
  compact?: boolean;
}) {
  const fills = starFills(rating);
  const label =
    rating === null
      ? 'No customer rating yet'
      : `${formatRating(rating)} out of 5 stars from ${formatReviewCount(reviewCount)} reviews`;

  return (
    <span className="inline-flex items-center gap-1.5" aria-label={label} title={label}>
      <span className="inline-flex items-center gap-px" aria-hidden="true">
        {fills.map((fill, index) => (
          <Star key={index} fill={fill} size={size} id={`${index}-${Math.round(fill * 100)}`} />
        ))}
      </span>

      <span className="nums text-sm font-semibold text-ink" aria-hidden="true">
        {formatRating(rating)}
      </span>

      {showCount && (
        <span className="nums text-sm text-ink-muted" aria-hidden="true">
          {compact ? `(${formatReviewCount(reviewCount)})` : `· ${formatReviewCount(reviewCount)} reviews`}
        </span>
      )}
    </span>
  );
}

/** One star. `fill` is 0–1; anything between gets a clip-path partial fill. */
function Star({ fill, size, id }: { fill: number; size: number; id: string }) {
  const path =
    'M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45L2.6 9.45l6.5-.95z';
  const clipId = `star-clip-${id}`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="presentation">
      <path d={path} fill="var(--star-empty)" />
      {fill > 0 && (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={24 * fill} height="24" />
            </clipPath>
          </defs>
          <path d={path} fill="var(--star)" clipPath={`url(#${clipId})`} />
        </>
      )}
    </svg>
  );
}
