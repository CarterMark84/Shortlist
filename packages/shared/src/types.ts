/**
 * Core domain types.
 *
 * This file is dependency-free on purpose: it is consumed by the Next.js web
 * app, the Expo mobile app, AND the Deno edge function. Imports inside this
 * `src/` tree always carry an explicit `.ts` extension so Deno can read the
 * files verbatim (see scripts/sync-shared.mjs).
 */

/** A product candidate from an Amazon data provider, normalized. */
export interface ProductCandidate {
  /** Amazon Standard Identification Number — the stable product key. */
  asin: string;
  title: string;
  imageUrl: string | null;
  /** Absolute URL to the Amazon product detail page. */
  productUrl: string;
  /** Price in minor units (cents). `null` when the provider returned no price. */
  priceCents: number | null;
  /** ISO 4217 code, e.g. "USD". */
  currency: string;
  /** Mean star rating, 0–5. `null` when the product has no rating yet. */
  rating: number | null;
  /** Total number of customer ratings. */
  reviewCount: number;
  /** Zero-based position in the provider's own organic result list. */
  position: number;
  /** True for paid placements, which are excluded before scoring. */
  sponsored: boolean;
}

/**
 * The structured reading of a user's vague description, produced by Claude.
 * Everything except `keywords` and `interpretation` is best-effort.
 */
export interface ExpandedQuery {
  /** Search terms to send to Amazon — the single most important output. */
  keywords: string;
  /** Amazon department name, when confidently inferable. */
  category: string | null;
  /** Concrete features the product must have, e.g. ["leakproof lid"]. */
  mustHave: string[];
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  /** One-line restatement shown back to the user so they can confirm intent. */
  interpretation: string;
}

/** Per-signal detail behind a product's score, persisted so results stay explainable. */
export interface ScoreBreakdown {
  /** 0–1. How well the listing matches what the user asked for. */
  relevance: number;
  /** 0–5. Star rating after Bayesian shrinkage toward the global mean. */
  adjustedRating: number;
  /** 0–1. `adjustedRating` normalized. */
  ratingComponent: number;
  /** 0–1. Log-scaled review count, normalized across the candidate set. */
  reviewVolume: number;
  /** 0–1. Inverse price, normalized across the candidate set. 0.5 when unpriced. */
  priceValue: number;
  /** Each component after its weight is applied; these sum to `score`. */
  weighted: {
    relevance: number;
    rating: number;
    reviewVolume: number;
    priceValue: number;
  };
}

/** A candidate that survived filtering, scored and placed. */
export interface RankedProduct extends ProductCandidate {
  /** 1-based final position. */
  rank: number;
  /** Blended score, 0–1. */
  score: number;
  breakdown: ScoreBreakdown;
}

/** Response body of `POST /functions/v1/recommend`. */
export interface RecommendResponse {
  searchId: string;
  /** The user's original, unmodified text. */
  query: string;
  expanded: ExpandedQuery;
  results: RankedProduct[];
  meta: {
    /** Candidates the provider returned, before filtering. */
    candidateCount: number;
    /** Candidates that survived filtering and were scored. */
    scoredCount: number;
    provider: string;
    /** True when provider results came from `query_cache` rather than a paid call. */
    cached: boolean;
  };
}

export interface RecommendRequest {
  query: string;
}

/**
 * Shape returned by the edge function on failure.
 *
 * Note there is no "no results" code: finding nothing is a successful search
 * with an empty `results` array, so the UI can still show what was understood
 * and help the user refine. `meta.candidateCount` distinguishes "Amazon
 * returned nothing" from "everything was filtered out".
 */
export interface ApiErrorBody {
  error: string;
  code:
    | 'unauthorized'
    | 'invalid_request'
    | 'rate_limited'
    | 'interpretation_error'
    | 'provider_error'
    | 'internal_error';
  /** Present on `rate_limited` — seconds until the caller may retry. */
  retryAfter?: number;
}

/** A row from `searches`, joined with its results, for the history screen. */
export interface SearchSummary {
  id: string;
  rawQuery: string;
  interpretation: string | null;
  createdAt: string;
  resultCount: number;
  /** Thumbnails of the top results, for a compact preview. */
  previewImages: string[];
}

/** A row from `saved_products`. */
export interface SavedProduct {
  id: string;
  asin: string;
  savedAt: string;
  product: ProductCandidate;
}
