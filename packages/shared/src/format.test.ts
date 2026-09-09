import { describe, expect, it } from 'vitest';

import {
  canonicalAmazonUrl,
  formatCompactCount,
  formatPercent,
  formatPrice,
  formatRating,
  formatRelativeTime,
  formatReviewCount,
  starFills,
} from './format.ts';

describe('formatPrice', () => {
  it('shows cents when there are any', () => {
    expect(formatPrice(1299)).toBe('$12.99');
  });

  it('omits trailing .00 on whole-dollar prices', () => {
    expect(formatPrice(2500)).toBe('$25');
  });

  it('renders a dash for a missing price rather than $0', () => {
    expect(formatPrice(null)).toBe('—');
  });

  it('honours a non-USD currency', () => {
    expect(formatPrice(1299, 'GBP', 'en-GB')).toBe('£12.99');
  });
});

describe('formatRating', () => {
  it('always shows one decimal so cards do not jitter', () => {
    expect(formatRating(4)).toBe('4.0');
    expect(formatRating(4.6)).toBe('4.6');
    expect(formatRating(4.64)).toBe('4.6');
    expect(formatRating(4.68)).toBe('4.7');
  });

  it('renders a dash when unrated', () => {
    expect(formatRating(null)).toBe('—');
  });
});

describe('formatReviewCount', () => {
  it('groups thousands', () => {
    expect(formatReviewCount(20_431)).toBe('20,431');
  });
});

describe('formatCompactCount', () => {
  it('leaves counts under 1000 alone', () => {
    expect(formatCompactCount(999)).toBe('999');
  });

  it('abbreviates thousands and millions', () => {
    expect(formatCompactCount(20_431)).toBe('20K');
    expect(formatCompactCount(1234)).toBe('1.2K');
    expect(formatCompactCount(2_500_000)).toBe('2.5M');
  });
});

describe('canonicalAmazonUrl', () => {
  it('builds a clean /dp/ link, discarding provider tracking params', () => {
    expect(canonicalAmazonUrl('B08N5WRWNW')).toBe('https://www.amazon.com/dp/B08N5WRWNW');
  });

  it('appends an Associates tag when configured', () => {
    expect(canonicalAmazonUrl('B08N5WRWNW', 'amazon.com', 'mytag-20')).toBe(
      'https://www.amazon.com/dp/B08N5WRWNW?tag=mytag-20',
    );
  });

  it('supports other marketplaces', () => {
    expect(canonicalAmazonUrl('B08N5WRWNW', 'amazon.co.uk')).toBe(
      'https://www.amazon.co.uk/dp/B08N5WRWNW',
    );
  });
});

describe('starFills', () => {
  it('splits a rating into per-star fill fractions', () => {
    const fills = starFills(4.6);
    expect(fills).toHaveLength(5);
    expect(fills.slice(0, 4)).toEqual([1, 1, 1, 1]);
    expect(fills[4]).toBeCloseTo(0.6, 5);
  });

  it('renders an unrated product as five empty stars', () => {
    expect(starFills(null)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('formatPercent', () => {
  it('rounds to whole percents', () => {
    expect(formatPercent(0.8123)).toBe('81%');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-09-08T12:00:00Z');

  it('collapses the last minute to "just now"', () => {
    expect(formatRelativeTime('2026-09-08T11:59:30Z', now)).toBe('just now');
  });

  it('reports hours', () => {
    expect(formatRelativeTime('2026-09-08T10:00:00Z', now)).toBe('2 hours ago');
  });

  it('reports days', () => {
    expect(formatRelativeTime('2026-09-05T12:00:00Z', now)).toBe('3 days ago');
  });
});
