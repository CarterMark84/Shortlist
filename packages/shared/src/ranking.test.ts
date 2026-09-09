import { describe, expect, it } from 'vitest';

import type { ExpandedQuery, ProductCandidate } from './types.ts';
import {
  assertWeightsValid,
  bayesianRating,
  DEFAULT_RANKING_CONFIG,
  filterCandidates,
  priceValueScore,
  rankProducts,
  relevanceScore,
  reviewVolumeScore,
  tokenize,
  WEIGHTS,
} from './ranking.ts';

/** Build a candidate with sensible defaults so tests only state what matters. */
function candidate(overrides: Partial<ProductCandidate> = {}): ProductCandidate {
  return {
    asin: overrides.asin ?? `ASIN${Math.random().toString(36).slice(2, 10)}`,
    title: 'Insulated Travel Mug 16oz Leakproof Stainless Steel',
    imageUrl: 'https://example.test/image.jpg',
    productUrl: 'https://www.amazon.com/dp/TEST',
    priceCents: 2499,
    currency: 'USD',
    rating: 4.5,
    reviewCount: 1000,
    position: 0,
    sponsored: false,
    ...overrides,
  };
}

function expanded(overrides: Partial<ExpandedQuery> = {}): ExpandedQuery {
  return {
    keywords: 'insulated travel mug leakproof',
    category: null,
    mustHave: [],
    budgetMinCents: null,
    budgetMaxCents: null,
    interpretation: 'A travel mug that keeps coffee hot',
    ...overrides,
  };
}

describe('weights', () => {
  it('sum to exactly 1', () => {
    expect(() => assertWeightsValid()).not.toThrow();
    const sum = WEIGHTS.relevance + WEIGHTS.rating + WEIGHTS.reviewVolume + WEIGHTS.priceValue;
    expect(sum).toBeCloseTo(1, 10);
  });

  it('match the agreed 40/25/20/15 split', () => {
    expect(WEIGHTS).toEqual({
      relevance: 0.4,
      rating: 0.25,
      reviewVolume: 0.2,
      priceValue: 0.15,
    });
  });
});

describe('bayesianRating', () => {
  it('shrinks a thinly-reviewed perfect score toward the global mean', () => {
    // 4.9 stars from only 6 reviews is weak evidence.
    expect(bayesianRating(4.9, 6)).toBeCloseTo(4.364, 2);
  });

  it('leaves a heavily-reviewed rating essentially untouched', () => {
    expect(bayesianRating(4.6, 20_431)).toBeCloseTo(4.599, 2);
  });

  it('THE GUARD CASE: 4.9 stars / 6 reviews must not beat 4.6 stars / 20,431 reviews', () => {
    const thin = bayesianRating(4.9, 6);
    const proven = bayesianRating(4.6, 20_431);
    expect(thin).toBeLessThan(proven);
  });

  it('returns exactly the prior mean at zero reviews', () => {
    expect(bayesianRating(5, 0)).toBeCloseTo(DEFAULT_RANKING_CONFIG.priorMean, 10);
  });

  it('sits halfway between the rating and the prior at exactly m reviews', () => {
    const { priorWeight, priorMean } = DEFAULT_RANKING_CONFIG;
    expect(bayesianRating(5, priorWeight)).toBeCloseTo((5 + priorMean) / 2, 10);
  });

  it('treats a null rating as the prior mean', () => {
    expect(bayesianRating(null, 5000)).toBeCloseTo(DEFAULT_RANKING_CONFIG.priorMean, 10);
  });
});

describe('reviewVolumeScore', () => {
  it('gives the most-reviewed candidate a perfect 1', () => {
    expect(reviewVolumeScore(50_000, 50_000)).toBeCloseTo(1, 10);
  });

  it('is log-scaled, not linear — 1% of the reviews scores far above 1%', () => {
    const linearWouldBe = 500 / 50_000; // 0.01
    const actual = reviewVolumeScore(500, 50_000);
    expect(actual).toBeGreaterThan(linearWouldBe * 10);
    expect(actual).toBeLessThan(1);
  });

  it('is monotonic in review count', () => {
    const counts = [0, 10, 100, 1_000, 10_000, 100_000];
    const scores = counts.map((c) => reviewVolumeScore(c, 100_000));
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]!).toBeGreaterThan(scores[i - 1]!);
    }
  });

  it('returns 0 when the whole set is unreviewed', () => {
    expect(reviewVolumeScore(0, 0)).toBe(0);
  });
});

describe('priceValueScore', () => {
  it('scores the cheapest candidate 1 and the priciest 0', () => {
    expect(priceValueScore(1000, 1000, 5000)).toBeCloseTo(1, 10);
    expect(priceValueScore(5000, 1000, 5000)).toBeCloseTo(0, 10);
  });

  it('scores the midpoint 0.5', () => {
    expect(priceValueScore(3000, 1000, 5000)).toBeCloseTo(0.5, 10);
  });

  it('stays neutral rather than punishing a missing price', () => {
    expect(priceValueScore(null, 1000, 5000)).toBe(0.5);
  });

  it('stays neutral when every candidate costs the same', () => {
    expect(priceValueScore(2500, 2500, 2500)).toBe(0.5);
  });
});

describe('tokenize', () => {
  it('drops stopwords, punctuation and single characters', () => {
    expect(tokenize('something to keep my coffee hot on my long commute!')).toEqual([
      'keep',
      'coffee',
      'hot',
      'long',
      'commute',
    ]);
  });
});

describe('relevanceScore', () => {
  it('rewards a title containing the keywords over one that does not', () => {
    const query = expanded({ keywords: 'insulated travel mug leakproof' });
    const onTopic = relevanceScore(
      candidate({ title: 'Insulated Travel Mug Leakproof Tumbler', position: 5 }),
      query,
    );
    const offTopic = relevanceScore(
      candidate({ title: 'Ceramic Dinner Plate Set', position: 5 }),
      query,
    );
    expect(onTopic).toBeGreaterThan(offTopic);
  });

  it('rewards an earlier provider position, all else equal', () => {
    const query = expanded();
    const early = relevanceScore(candidate({ position: 0 }), query);
    const late = relevanceScore(candidate({ position: 19 }), query);
    expect(early).toBeGreaterThan(late);
  });

  it('rewards must-have coverage', () => {
    const query = expanded({ keywords: 'travel mug', mustHave: ['leakproof lid'] });
    const withFeature = relevanceScore(candidate({ title: 'Travel Mug with Leakproof Lid' }), query);
    const withoutFeature = relevanceScore(
      candidate({ title: 'Travel Mug Stainless Steel' }),
      query,
    );
    expect(withFeature).toBeGreaterThan(withoutFeature);
  });

  it('always produces a value in [0, 1]', () => {
    const score = relevanceScore(candidate({ position: 47 }), expanded());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('does not let placement alone carry an off-topic listing', () => {
    // A first-place listing matching none of the keywords must stay below the
    // midpoint, or it can outvote a genuine title match on price alone.
    const score = relevanceScore(
      candidate({ title: 'Ceramic Dinner Plate Set of 4', position: 0 }),
      expanded({ keywords: 'insulated travel mug leakproof' }),
    );
    expect(score).toBeLessThan(0.5);
  });

  it('is insensitive to how many candidates survived filtering', () => {
    // Regression: position was once normalized against the survivor count, so
    // the same listing scored differently in a small set than a large one.
    const query = expanded();
    expect(relevanceScore(candidate({ position: 1 }), query)).toBeCloseTo(
      relevanceScore(candidate({ position: 1 }), query),
      10,
    );
    const early = relevanceScore(candidate({ position: 0 }), query);
    const next = relevanceScore(candidate({ position: 1 }), query);
    // Adjacent positions should differ by a hair, not a chasm.
    expect(early - next).toBeLessThan(0.02);
  });
});

describe('filterCandidates', () => {
  it('drops sponsored placements', () => {
    const result = filterCandidates(
      [candidate({ asin: 'A', sponsored: true }), candidate({ asin: 'B' })],
      expanded(),
    );
    expect(result.map((c) => c.asin)).toEqual(['B']);
  });

  it('drops unrated listings', () => {
    const result = filterCandidates(
      [candidate({ asin: 'A', rating: null }), candidate({ asin: 'B' })],
      expanded(),
    );
    expect(result.map((c) => c.asin)).toEqual(['B']);
  });

  it('drops listings below the review noise floor', () => {
    const result = filterCandidates(
      [candidate({ asin: 'A', reviewCount: 9 }), candidate({ asin: 'B', reviewCount: 10 })],
      expanded(),
    );
    expect(result.map((c) => c.asin)).toEqual(['B']);
  });

  it('drops poorly-rated listings', () => {
    const result = filterCandidates(
      [candidate({ asin: 'A', rating: 2.4 }), candidate({ asin: 'B', rating: 3.1 })],
      expanded(),
    );
    expect(result.map((c) => c.asin)).toEqual(['B']);
  });

  it('deduplicates repeated ASINs', () => {
    const result = filterCandidates(
      [candidate({ asin: 'DUPE' }), candidate({ asin: 'DUPE' }), candidate({ asin: 'OTHER' })],
      expanded(),
    );
    expect(result.map((c) => c.asin)).toEqual(['DUPE', 'OTHER']);
  });

  it('enforces an inferred budget ceiling', () => {
    const result = filterCandidates(
      [candidate({ asin: 'CHEAP', priceCents: 4000 }), candidate({ asin: 'PRICEY', priceCents: 20_000 })],
      expanded({ budgetMaxCents: 15_000 }),
    );
    expect(result.map((c) => c.asin)).toEqual(['CHEAP']);
  });

  it('enforces an inferred budget floor', () => {
    const result = filterCandidates(
      [candidate({ asin: 'CHEAP', priceCents: 500 }), candidate({ asin: 'MID', priceCents: 5000 })],
      expanded({ budgetMinCents: 2000 }),
    );
    expect(result.map((c) => c.asin)).toEqual(['MID']);
  });

  it('keeps unpriced listings even when a budget was inferred', () => {
    const result = filterCandidates(
      [candidate({ asin: 'NOPRICE', priceCents: null })],
      expanded({ budgetMaxCents: 1000 }),
    );
    expect(result.map((c) => c.asin)).toEqual(['NOPRICE']);
  });
});

describe('rankProducts', () => {
  it('returns at most 5 products', () => {
    const candidates = Array.from({ length: 40 }, (_, i) =>
      candidate({ asin: `ASIN${i}`, position: i }),
    );
    expect(rankProducts(candidates, expanded())).toHaveLength(5);
  });

  it('returns them in descending score order with 1-based ranks', () => {
    const candidates = Array.from({ length: 12 }, (_, i) =>
      candidate({
        asin: `ASIN${i}`,
        position: i,
        rating: 3.5 + (i % 4) * 0.4,
        reviewCount: 100 * (i + 1),
        priceCents: 1000 + i * 500,
      }),
    );
    const ranked = rankProducts(candidates, expanded());

    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i]!.score).toBeLessThanOrEqual(ranked[i - 1]!.score);
    }
  });

  it('excludes a 6-review listing outright — below the noise floor', () => {
    const ranked = rankProducts(
      [
        candidate({ asin: 'THIN', rating: 4.9, reviewCount: 6, position: 0 }),
        candidate({ asin: 'PROVEN', rating: 4.6, reviewCount: 20_431, position: 1 }),
      ],
      expanded(),
    );
    expect(ranked.map((r) => r.asin)).toEqual(['PROVEN']);
  });

  it('END TO END: the proven 4.6 outranks a thin 4.9 that clears the noise floor', () => {
    const ranked = rankProducts(
      [
        // 12 reviews survives filtering, so this exercises the shrinkage itself
        // rather than the floor. It is also listed FIRST by the provider, so it
        // holds the positional advantage too — and must still lose.
        candidate({ asin: 'THIN', rating: 4.9, reviewCount: 12, position: 0 }),
        candidate({ asin: 'PROVEN', rating: 4.6, reviewCount: 20_431, position: 1 }),
      ],
      expanded(),
    );
    expect(ranked.map((r) => r.asin)).toEqual(['PROVEN', 'THIN']);
  });

  it('produces a breakdown whose weighted parts sum to the score', () => {
    const ranked = rankProducts(
      Array.from({ length: 6 }, (_, i) => candidate({ asin: `A${i}`, position: i })),
      expanded(),
    );
    for (const product of ranked) {
      const { weighted } = product.breakdown;
      const sum = weighted.relevance + weighted.rating + weighted.reviewVolume + weighted.priceValue;
      expect(sum).toBeCloseTo(product.score, 10);
    }
  });

  it('keeps every score within [0, 1]', () => {
    const ranked = rankProducts(
      Array.from({ length: 30 }, (_, i) =>
        candidate({
          asin: `A${i}`,
          position: i,
          rating: 3 + (i % 5) * 0.5,
          reviewCount: i * 977,
          priceCents: i % 7 === 0 ? null : 500 + i * 1200,
        }),
      ),
      expanded(),
    );
    for (const product of ranked) {
      expect(product.score).toBeGreaterThanOrEqual(0);
      expect(product.score).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic — identical input yields identical output', () => {
    const candidates = Array.from({ length: 20 }, (_, i) =>
      candidate({ asin: `A${i}`, position: i, rating: 4.5, reviewCount: 1000, priceCents: 2500 }),
    );
    const first = rankProducts(candidates, expanded()).map((r) => r.asin);
    const second = rankProducts(candidates, expanded()).map((r) => r.asin);
    expect(first).toEqual(second);
  });

  it('returns an empty array when nothing survives filtering', () => {
    expect(rankProducts([candidate({ sponsored: true })], expanded())).toEqual([]);
    expect(rankProducts([], expanded())).toEqual([]);
  });

  it('returns fewer than 5 rather than padding when the set is small', () => {
    const ranked = rankProducts(
      [candidate({ asin: 'A' }), candidate({ asin: 'B' })],
      expanded(),
    );
    expect(ranked).toHaveLength(2);
  });

  it('prefers the cheaper listing when quality signals are identical', () => {
    const ranked = rankProducts(
      [
        candidate({ asin: 'PRICEY', priceCents: 9999, position: 0 }),
        candidate({ asin: 'CHEAPER', priceCents: 1999, position: 0 }),
      ],
      expanded(),
    );
    expect(ranked[0]!.asin).toBe('CHEAPER');
  });

  it('prefers the more relevant listing even when it costs more', () => {
    // Relevance is weighted 0.40 vs price's 0.15, so a strong title match wins.
    const ranked = rankProducts(
      [
        candidate({
          asin: 'OFFTOPIC',
          title: 'Ceramic Dinner Plate Set of 4',
          priceCents: 1000,
          position: 0,
        }),
        candidate({
          asin: 'ONTOPIC',
          title: 'Insulated Travel Mug Leakproof 16oz',
          priceCents: 4000,
          position: 1,
        }),
      ],
      expanded({ keywords: 'insulated travel mug leakproof' }),
    );
    expect(ranked[0]!.asin).toBe('ONTOPIC');
  });
});
