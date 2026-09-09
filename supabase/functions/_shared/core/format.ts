// ═══════════════════════════════════════════════════════════════════════
// GENERATED FILE — DO NOT EDIT.
// Mirrored from packages/shared/src/format.ts by scripts/sync-shared.mjs.
// Edit the source there, then run `npm run sync:shared`.
// ═══════════════════════════════════════════════════════════════════════

/** Display formatters, shared so web and mobile render identical strings. */

/** `1299` → `"$12.99"`. Returns a dash for missing prices. */
export function formatPrice(
  priceCents: number | null,
  currency = 'USD',
  locale = 'en-US',
): string {
  if (priceCents === null || !Number.isFinite(priceCents)) return '—';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      // Show cents only when there are any: $12.99 but $25 rather than $25.00.
      minimumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(priceCents / 100);
  } catch {
    return `$${(priceCents / 100).toFixed(2)}`;
  }
}

/** `4.6` → `"4.6"`. Always one decimal, so cards don't jitter between 4 and 4.6. */
export function formatRating(rating: number | null): string {
  if (rating === null || !Number.isFinite(rating)) return '—';
  return rating.toFixed(1);
}

/** `20431` → `"20,431"`. */
export function formatReviewCount(count: number, locale = 'en-US'): string {
  if (!Number.isFinite(count)) return '0';
  try {
    return new Intl.NumberFormat(locale).format(Math.round(count));
  } catch {
    return String(Math.round(count));
  }
}

/** `20431` → `"20.4K"`. For tight spaces like mobile cards. */
export function formatCompactCount(count: number): string {
  if (!Number.isFinite(count) || count < 1000) return String(Math.max(0, Math.round(count)));
  if (count < 1_000_000) {
    const thousands = count / 1000;
    return `${thousands < 10 ? thousands.toFixed(1) : Math.round(thousands)}K`;
  }
  const millions = count / 1_000_000;
  return `${millions < 10 ? millions.toFixed(1) : Math.round(millions)}M`;
}

/**
 * Build a canonical Amazon product URL from an ASIN.
 *
 * Providers hand back long, tracker-laden links; we rebuild a clean `/dp/`
 * link instead. `associateTag` appends an Amazon Associates tag when one is
 * configured.
 */
export function canonicalAmazonUrl(
  asin: string,
  domain = 'amazon.com',
  associateTag?: string | null,
): string {
  const base = `https://www.${domain}/dp/${encodeURIComponent(asin)}`;
  return associateTag ? `${base}?tag=${encodeURIComponent(associateTag)}` : base;
}

/** `0.8123` → `"81%"`. Used in the score breakdown. */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * 100)}%`;
}

/** ISO timestamp → `"2 hours ago"`, for history lists. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return 'just now';

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3600],
    ['minute', 60],
  ];

  for (const [unit, secondsPerUnit] of units) {
    const amount = Math.floor(seconds / secondsPerUnit);
    if (amount >= 1) {
      try {
        return new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(-amount, unit);
      } catch {
        return `${amount} ${unit}${amount === 1 ? '' : 's'} ago`;
      }
    }
  }
  return 'just now';
}

/**
 * Fractional star fills for a 0–5 rating, e.g. `4.6` → `[1, 1, 1, 1, 0.6]`.
 * Lets both platforms draw partially-filled stars from the same numbers.
 */
export function starFills(rating: number | null, starCount = 5): number[] {
  const value = rating === null || !Number.isFinite(rating) ? 0 : Math.min(starCount, Math.max(0, rating));
  return Array.from({ length: starCount }, (_, index) =>
    Math.min(1, Math.max(0, value - index)),
  );
}
