/**
 * The ranking algorithm.
 *
 * Turns a provider's raw candidate list into the top 5, blending four signals
 * the user asked for: relevance, star rating, review volume and price.
 *
 * Kept as pure, dependency-free functions so it can be unit-tested directly
 * and reused verbatim by the Deno edge function.
 */

import type {
  ExpandedQuery,
  ProductCandidate,
  RankedProduct,
  ScoreBreakdown,
} from './types.ts';

/**
 * Signal weights. They must sum to 1 — `assertWeightsValid` checks this and the
 * test suite asserts it, so a bad edit fails loudly rather than silently
 * skewing every result.
 */
export const WEIGHTS = {
  relevance: 0.4,
  rating: 0.25,
  reviewVolume: 0.2,
  priceValue: 0.15,
} as const;

export interface RankingConfig {
  /**
   * Bayesian prior weight (`m`): how many reviews a listing needs before its
   * rating is taken at close to face value. At `m` reviews the rating sits
   * halfway between its own value and the global mean.
   */
  priorWeight: number;
  /** Bayesian prior mean (`C`): the global mean star rating to shrink toward. */
  priorMean: number;
  /** Listings with fewer ratings than this are dropped as noise. */
  minReviewCount: number;
  /** Listings rated below this are dropped outright. */
  minRating: number;
  /** How many products to return. */
  topN: number;
  /**
   * Weight of provider position vs. lexical match inside the relevance signal.
   * Kept below 0.5 deliberately: Amazon's ordering is a strong signal, but a
   * listing whose title matches none of the request should never coast to a
   * high relevance score on placement alone.
   */
  positionWeight: number;
  /** Within the lexical part of relevance, weight given to must-have coverage. */
  mustHaveWeight: number;
  /**
   * Result position at which the positional signal reaches zero — roughly one
   * Amazon results page.
   *
   * This is a *fixed* horizon rather than the candidate count on purpose.
   * Normalizing against the surviving set size made the gap between position 0
   * and position 1 depend on how many candidates happened to survive filtering
   * (a chasm in a 2-item set, a rounding error in a 48-item one).
   */
  positionHorizon: number;
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  priorWeight: 50,
  priorMean: 4.3,
  minReviewCount: 10,
  minRating: 3,
  topN: 5,
  positionWeight: 0.45,
  mustHaveWeight: 0.3,
  positionHorizon: 48,
};

const MAX_STARS = 5;

/** Words too common to carry meaning when matching a title against keywords. */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'but', 'by', 'can', 'for',
  'from', 'good', 'have', 'i', 'in', 'is', 'it', 'its', 'me', 'my', 'need',
  'of', 'on', 'or', 'our', 'possible', 'something', 'that', 'the', 'their',
  'this', 'to', 'up', 'want', 'was', 'what', 'which', 'will', 'with', 'you',
  'your',
]);

/** Lowercase, strip punctuation, drop stopwords and one-character noise. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Star rating shrunk toward the global mean in proportion to how little
 * evidence backs it: `adj = (v/(v+m))·R + (m/(v+m))·C`.
 *
 * This is what stops a 5.0-star listing with 4 reviews from outranking a 4.6
 * with 20,000 — the whole reason the user's "highest rating" and "most reviews"
 * criteria don't fight each other.
 */
export function bayesianRating(
  rating: number | null,
  reviewCount: number,
  config: RankingConfig = DEFAULT_RANKING_CONFIG,
): number {
  const { priorWeight: m, priorMean: c } = config;
  if (rating === null || !Number.isFinite(rating)) return c;
  const v = Math.max(0, reviewCount);
  if (v + m === 0) return c;
  return (v / (v + m)) * rating + (m / (v + m)) * c;
}

/**
 * Log-scaled review count, normalized against the most-reviewed candidate in
 * the set. Log scaling keeps a 200,000-review blockbuster from flattening every
 * other signal while still rewarding genuine popularity.
 */
export function reviewVolumeScore(reviewCount: number, maxReviewCount: number): number {
  if (maxReviewCount <= 0) return 0;
  const numerator = Math.log10(1 + Math.max(0, reviewCount));
  const denominator = Math.log10(1 + maxReviewCount);
  if (denominator <= 0) return 0;
  return clamp01(numerator / denominator);
}

/**
 * Inverse price, normalized across the candidate set: cheapest scores 1,
 * priciest 0. Unpriced listings get a neutral 0.5 rather than being punished
 * for a gap in the provider's data.
 */
export function priceValueScore(
  priceCents: number | null,
  minPriceCents: number,
  maxPriceCents: number,
): number {
  if (priceCents === null || !Number.isFinite(priceCents)) return 0.5;
  if (maxPriceCents <= minPriceCents) return 0.5;
  const position = (priceCents - minPriceCents) / (maxPriceCents - minPriceCents);
  return clamp01(1 - position);
}

/**
 * How well a listing matches the request, blending two independent views:
 *
 *  - **position** — Amazon's own relevance ordering, which is strong and
 *    already accounts for signals we can't see.
 *  - **lexical** — how much of Claude's extracted keyword set and must-have
 *    feature list actually appears in the product title.
 */
export function relevanceScore(
  candidate: ProductCandidate,
  expanded: ExpandedQuery,
  config: RankingConfig = DEFAULT_RANKING_CONFIG,
): number {
  const positional = clamp01(1 - candidate.position / Math.max(1, config.positionHorizon));

  const titleTokens = new Set(tokenize(candidate.title));
  const keywordTokens = tokenize(expanded.keywords);

  const keywordCoverage =
    keywordTokens.length === 0
      ? 0.5
      : keywordTokens.filter((token) => titleTokens.has(token)).length / keywordTokens.length;

  const mustHaveTokens = expanded.mustHave.flatMap(tokenize);
  const mustHaveCoverage =
    mustHaveTokens.length === 0
      ? null
      : mustHaveTokens.filter((token) => titleTokens.has(token)).length / mustHaveTokens.length;

  const lexical =
    mustHaveCoverage === null
      ? keywordCoverage
      : (1 - config.mustHaveWeight) * keywordCoverage + config.mustHaveWeight * mustHaveCoverage;

  return clamp01(config.positionWeight * positional + (1 - config.positionWeight) * lexical);
}

/**
 * Remove candidates that shouldn't compete at all: paid placements, unrated or
 * thinly-rated listings, duplicate ASINs, and anything outside a budget the
 * user implied.
 */
export function filterCandidates(
  candidates: readonly ProductCandidate[],
  expanded: ExpandedQuery,
  config: RankingConfig = DEFAULT_RANKING_CONFIG,
): ProductCandidate[] {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (candidate.sponsored) return false;
    if (!candidate.asin || seen.has(candidate.asin)) return false;
    if (candidate.rating === null) return false;
    if (candidate.rating < config.minRating) return false;
    if (candidate.reviewCount < config.minReviewCount) return false;

    // Only enforce a budget on listings we actually have a price for.
    if (candidate.priceCents !== null) {
      if (expanded.budgetMaxCents !== null && candidate.priceCents > expanded.budgetMaxCents) {
        return false;
      }
      if (expanded.budgetMinCents !== null && candidate.priceCents < expanded.budgetMinCents) {
        return false;
      }
    }

    seen.add(candidate.asin);
    return true;
  });
}

/** Verify the weights still sum to 1. Throws rather than skewing results quietly. */
export function assertWeightsValid(): void {
  const sum = WEIGHTS.relevance + WEIGHTS.rating + WEIGHTS.reviewVolume + WEIGHTS.priceValue;
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`Ranking weights must sum to 1, got ${sum}`);
  }
}

/**
 * Score and order candidates, returning the top `config.topN`.
 *
 * Normalization (review volume, price) happens across the *surviving* candidate
 * set, so scores are relative to the real competition for this query rather
 * than to an absolute scale.
 */
export function rankProducts(
  candidates: readonly ProductCandidate[],
  expanded: ExpandedQuery,
  config: RankingConfig = DEFAULT_RANKING_CONFIG,
): RankedProduct[] {
  assertWeightsValid();

  const survivors = filterCandidates(candidates, expanded, config);
  if (survivors.length === 0) return [];

  const maxReviewCount = survivors.reduce((max, c) => Math.max(max, c.reviewCount), 0);

  const prices = survivors
    .map((c) => c.priceCents)
    .filter((p): p is number => p !== null && Number.isFinite(p));
  const minPriceCents = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPriceCents = prices.length > 0 ? Math.max(...prices) : 0;

  const scored = survivors.map((candidate) => {
    const relevance = relevanceScore(candidate, expanded, config);
    const adjustedRating = bayesianRating(candidate.rating, candidate.reviewCount, config);
    const ratingComponent = clamp01(adjustedRating / MAX_STARS);
    const reviewVolume = reviewVolumeScore(candidate.reviewCount, maxReviewCount);
    const priceValue = priceValueScore(candidate.priceCents, minPriceCents, maxPriceCents);

    const weighted = {
      relevance: relevance * WEIGHTS.relevance,
      rating: ratingComponent * WEIGHTS.rating,
      reviewVolume: reviewVolume * WEIGHTS.reviewVolume,
      priceValue: priceValue * WEIGHTS.priceValue,
    };

    const breakdown: ScoreBreakdown = {
      relevance,
      adjustedRating,
      ratingComponent,
      reviewVolume,
      priceValue,
      weighted,
    };

    const score =
      weighted.relevance + weighted.rating + weighted.reviewVolume + weighted.priceValue;

    return { candidate, score, breakdown };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Deterministic tiebreakers, so identical inputs always order identically.
    if (b.breakdown.adjustedRating !== a.breakdown.adjustedRating) {
      return b.breakdown.adjustedRating - a.breakdown.adjustedRating;
    }
    if (b.candidate.reviewCount !== a.candidate.reviewCount) {
      return b.candidate.reviewCount - a.candidate.reviewCount;
    }
    return a.candidate.position - b.candidate.position;
  });

  return scored.slice(0, config.topN).map((entry, index) => ({
    ...entry.candidate,
    rank: index + 1,
    score: entry.score,
    breakdown: entry.breakdown,
  }));
}

/**
 * Human-readable reason a product placed where it did, for the "why this
 * ranked here" disclosure on the result card.
 */
export function explainRank(product: RankedProduct): string[] {
  const { breakdown } = product;
  const parts = [
    { label: 'Relevance to your request', value: breakdown.weighted.relevance },
    { label: 'Customer rating', value: breakdown.weighted.rating },
    { label: 'Number of reviews', value: breakdown.weighted.reviewVolume },
    { label: 'Price', value: breakdown.weighted.priceValue },
  ];

  return parts
    .sort((a, b) => b.value - a.value)
    .map((part) => `${part.label}: ${(part.value * 100).toFixed(0)} pts`);
}
