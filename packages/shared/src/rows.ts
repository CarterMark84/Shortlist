/**
 * Database row shapes and mappers.
 *
 * Shared by web and mobile so the two clients cannot drift on how a
 * `search_results` row becomes a rendered product.
 *
 * Hand-written rather than generated: `supabase gen types` needs a linked
 * project, and these tables are small and stable. Regenerate with the CLI if
 * the schema starts moving.
 *
 * Not mirrored into the edge function (it writes rows, never reads them back),
 * so this file is absent from scripts/sync-shared.mjs.
 */

import type { ProductCandidate, ScoreBreakdown } from './types.ts';

/** `expanded_query` is jsonb — every field is untrusted. */
export interface ExpandedQueryJson {
  keywords?: string;
  category?: string | null;
  mustHave?: string[];
  budgetMinCents?: number | null;
  budgetMaxCents?: number | null;
  interpretation?: string;
}

export interface SearchRow {
  id: string;
  raw_query: string;
  expanded_query: ExpandedQueryJson | null;
  provider: string;
  candidate_count: number;
  scored_count: number;
  cached: boolean;
  created_at: string;
}

export interface SearchResultRow {
  id: string;
  search_id: string;
  rank: number;
  asin: string;
  title: string;
  image_url: string | null;
  product_url: string;
  price_cents: number | null;
  currency: string;
  /** Postgres `numeric` arrives as a string from PostgREST. */
  rating: number | string | null;
  review_count: number;
  score: number;
  score_breakdown: Partial<ScoreBreakdown> | null;
}

export interface SavedProductRow {
  id: string;
  asin: string;
  created_at: string;
  snapshot: Partial<ProductCandidate> | null;
}

/** Everything a product card needs to render. */
export interface DisplayProduct {
  asin: string;
  title: string;
  imageUrl: string | null;
  productUrl: string;
  priceCents: number | null;
  currency: string;
  rating: number | null;
  reviewCount: number;
  /** null for saved products, which have no ranking context. */
  rank: number | null;
  score: number | null;
  breakdown: ScoreBreakdown | null;
}

/**
 * PostgREST returns `numeric` columns as strings to avoid precision loss, so
 * `rating` must be coerced rather than cast.
 */
function toRating(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Only accept a breakdown with every field a chart would need. */
function toBreakdown(value: Partial<ScoreBreakdown> | null): ScoreBreakdown | null {
  if (
    !value ||
    typeof value.relevance !== 'number' ||
    typeof value.ratingComponent !== 'number' ||
    typeof value.reviewVolume !== 'number' ||
    typeof value.priceValue !== 'number' ||
    typeof value.adjustedRating !== 'number' ||
    !value.weighted
  ) {
    return null;
  }
  return value as ScoreBreakdown;
}

export function fromResultRow(row: SearchResultRow): DisplayProduct {
  return {
    asin: row.asin,
    title: row.title,
    imageUrl: row.image_url,
    productUrl: row.product_url,
    priceCents: row.price_cents,
    currency: row.currency,
    rating: toRating(row.rating),
    reviewCount: row.review_count,
    rank: row.rank,
    score: row.score,
    breakdown: toBreakdown(row.score_breakdown),
  };
}

/** Returns null when a snapshot is too incomplete to render. */
export function fromSavedRow(row: SavedProductRow): DisplayProduct | null {
  const snapshot = row.snapshot;
  if (!snapshot || typeof snapshot.title !== 'string' || typeof snapshot.productUrl !== 'string') {
    return null;
  }

  return {
    asin: row.asin,
    title: snapshot.title,
    imageUrl: snapshot.imageUrl ?? null,
    productUrl: snapshot.productUrl,
    priceCents: snapshot.priceCents ?? null,
    currency: snapshot.currency ?? 'USD',
    rating: typeof snapshot.rating === 'number' ? snapshot.rating : null,
    reviewCount: typeof snapshot.reviewCount === 'number' ? snapshot.reviewCount : 0,
    rank: null,
    score: null,
    breakdown: null,
  };
}

/** The snapshot persisted when a user saves a product. */
export function toSnapshot(product: DisplayProduct): ProductCandidate {
  return {
    asin: product.asin,
    title: product.title,
    imageUrl: product.imageUrl,
    productUrl: product.productUrl,
    priceCents: product.priceCents,
    currency: product.currency,
    rating: product.rating,
    reviewCount: product.reviewCount,
    position: (product.rank ?? 1) - 1,
    sponsored: false,
  };
}

/** Column lists, so both clients select exactly the same shape. */
export const SELECT_SEARCH =
  'id, raw_query, expanded_query, provider, candidate_count, scored_count, cached, created_at';

export const SELECT_SEARCH_RESULT =
  'id, search_id, rank, asin, title, image_url, product_url, price_cents, currency, rating, review_count, score, score_breakdown';

export const SELECT_SAVED_PRODUCT = 'id, asin, created_at, snapshot';
