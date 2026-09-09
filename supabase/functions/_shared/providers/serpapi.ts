/**
 * SerpApi Amazon Search provider.
 *
 * One call returns every ranking input the product needs: title, thumbnail,
 * link, price, star rating and review count.
 *
 *   GET https://serpapi.com/search.json
 *       ?engine=amazon&amazon_domain=amazon.com&k=<keywords>&api_key=<key>
 *
 * Free tier is 250 searches/month, so callers should consult `query_cache`
 * before reaching for this.
 */

import type { ProductCandidate } from '../core/types.ts';
import { canonicalAmazonUrl } from '../core/format.ts';
import {
  currencyFromPriceString,
  ProviderError,
  toCents,
  toNumber,
  type AmazonProvider,
  type ProviderSearchOptions,
} from './types.ts';

const ENDPOINT = 'https://serpapi.com/search.json';
const REQUEST_TIMEOUT_MS = 20_000;

/** The subset of a SerpApi organic result we rely on. Everything is optional. */
interface SerpApiOrganicResult {
  asin?: unknown;
  title?: unknown;
  link?: unknown;
  link_clean?: unknown;
  thumbnail?: unknown;
  rating?: unknown;
  reviews?: unknown;
  price?: unknown;
  extracted_price?: unknown;
  sponsored?: unknown;
  position?: unknown;
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[];
  error?: unknown;
}

export function createSerpApiProvider(apiKey: string): AmazonProvider {
  return {
    name: 'serpapi',

    async search(keywords: string, options: ProviderSearchOptions): Promise<ProductCandidate[]> {
      const url = new URL(ENDPOINT);
      url.searchParams.set('engine', 'amazon');
      url.searchParams.set('amazon_domain', options.domain);
      url.searchParams.set('k', keywords);
      url.searchParams.set('api_key', apiKey);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(url, { signal: controller.signal });
      } catch (cause) {
        const reason = cause instanceof Error && cause.name === 'AbortError'
          ? `timed out after ${REQUEST_TIMEOUT_MS}ms`
          : String(cause);
        throw new ProviderError('serpapi', `Request to SerpApi failed: ${reason}`);
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        // Surface the quota case distinctly — it is the most likely failure on
        // a free plan and the fix is different from a transient error.
        const detail = await response.text().catch(() => '');
        const hint = response.status === 429
          ? 'SerpApi rate limit or monthly search quota exhausted.'
          : detail.slice(0, 300);
        throw new ProviderError('serpapi', `SerpApi returned ${response.status}. ${hint}`, response.status);
      }

      const payload = (await response.json().catch(() => null)) as SerpApiResponse | null;
      if (payload === null) {
        throw new ProviderError('serpapi', 'SerpApi returned a response that was not valid JSON.');
      }
      if (typeof payload.error === 'string') {
        throw new ProviderError('serpapi', `SerpApi error: ${payload.error}`);
      }

      const organic = Array.isArray(payload.organic_results) ? payload.organic_results : [];

      const candidates: ProductCandidate[] = [];
      for (const raw of organic) {
        const candidate = normalize(raw, candidates.length, options);
        if (candidate !== null) candidates.push(candidate);
        if (candidates.length >= options.limit) break;
      }

      return candidates;
    },
  };
}

/** Map one SerpApi result to a `ProductCandidate`, or null if unusable. */
function normalize(
  raw: SerpApiOrganicResult,
  index: number,
  options: ProviderSearchOptions,
): ProductCandidate | null {
  const asin = typeof raw.asin === 'string' ? raw.asin.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';

  // Without an ASIN we cannot build a stable link or deduplicate, and without a
  // title the ranking has nothing to match against.
  if (asin.length === 0 || title.length === 0) return null;

  const priceCents = toCents(raw.extracted_price ?? raw.price);
  const rating = toNumber(raw.rating);
  const reviewCount = toNumber(raw.reviews);

  return {
    asin,
    title,
    imageUrl: typeof raw.thumbnail === 'string' ? raw.thumbnail : null,
    // Rebuild a clean /dp/ link rather than pass through SerpApi's tracker-laden one.
    productUrl: canonicalAmazonUrl(asin, options.domain, options.associateTag),
    priceCents,
    currency: currencyFromPriceString(raw.price),
    rating: rating !== null && rating >= 0 && rating <= 5 ? rating : null,
    reviewCount: reviewCount !== null && reviewCount >= 0 ? Math.round(reviewCount) : 0,
    position: index,
    sponsored: raw.sponsored === true,
  };
}
