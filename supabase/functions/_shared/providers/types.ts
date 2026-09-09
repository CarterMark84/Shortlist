import type { ProductCandidate } from '../core/types.ts';

/**
 * An Amazon product data source.
 *
 * Amazon's own APIs are not usable for this product: PA-API 5.0 was retired in
 * May 2026, and its replacement (the Creators API) requires an Associates
 * account with 10+ qualifying referred sales in the trailing 30 days. Neither
 * reliably returned star ratings or review counts — the two fields the ranking
 * depends on. So the data comes from a third-party provider behind this
 * interface, and swapping providers means adding one file.
 */
export interface AmazonProvider {
  readonly name: string;
  /**
   * Search the marketplace and return normalized candidates in provider order
   * (`position` 0 = first organic result).
   *
   * Implementations should throw `ProviderError` on failure rather than
   * returning an empty array, so the caller can tell "no matches" apart from
   * "the provider is down".
   */
  search(keywords: string, options: ProviderSearchOptions): Promise<ProductCandidate[]>;
}

export interface ProviderSearchOptions {
  /** e.g. `amazon.com`. */
  domain: string;
  /** Appended to outbound product links when set. */
  associateTag: string | null;
  /** Soft cap on candidates to return. */
  limit: number;
}

export class ProviderError extends Error {
  readonly provider: string;
  readonly status?: number;

  constructor(provider: string, message: string, status?: number) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.status = status;
  }
}

/** Coerce an unknown value to a finite number, or null. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Dollars (possibly a string like "$24.99") → integer cents. */
export function toCents(value: unknown): number | null {
  const dollars = toNumber(value);
  if (dollars === null || dollars < 0) return null;
  return Math.round(dollars * 100);
}

/** Pull an ISO-ish currency code out of a formatted price string. */
export function currencyFromPriceString(value: unknown, fallback = 'USD'): string {
  if (typeof value !== 'string') return fallback;
  if (value.includes('$')) return 'USD';
  if (value.includes('£')) return 'GBP';
  if (value.includes('€')) return 'EUR';
  if (value.includes('¥')) return 'JPY';
  return fallback;
}
