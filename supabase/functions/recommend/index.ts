/**
 * POST /functions/v1/recommend   { query: string }
 *
 * The one backend endpoint both the web and mobile clients call.
 *
 *   1. Verify the caller's JWT
 *   2. Rate-limit per user (protects the paid provider quota)
 *   3. Claude: vague description → structured search intent
 *   4. Cache lookup on the normalized keywords
 *   5. Provider: Amazon search → ~48 candidates
 *   6. Rank → top 5 with an explainable score breakdown
 *   7. Persist the search and its results
 *
 * The Anthropic and SerpApi keys live only here, as Supabase function secrets,
 * so they never reach a client bundle.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

import { cacheKeyFor, maybePurgeExpired, readCache, writeCache } from '../_shared/cache.ts';
import { rankProducts } from '../_shared/core/ranking.ts';
import type {
  ExpandedQuery,
  RankedProduct,
  RecommendResponse,
} from '../_shared/core/types.ts';
import { loadConfig, type FunctionConfig } from '../_shared/env.ts';
import { devFallbackExpansion, expandQuery, ExpansionError } from '../_shared/expand-query.ts';
import { errorResponse, handlePreflight, jsonResponse } from '../_shared/http.ts';
import { ProviderError, resolveProvider } from '../_shared/providers/index.ts';

/** Roughly one Amazon results page — matches `positionHorizon` in the ranker. */
const CANDIDATE_LIMIT = 48;
const MAX_QUERY_LENGTH = 500;
const RATE_WINDOW_SECONDS = 3600;

Deno.serve(async (request: Request): Promise<Response> => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  if (request.method !== 'POST') {
    return errorResponse('invalid_request', 'Use POST.', 405);
  }

  let config: FunctionConfig;
  try {
    config = loadConfig();
  } catch (cause) {
    console.error('Configuration error:', cause);
    return errorResponse('internal_error', 'The service is misconfigured.', 500);
  }

  const admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1. Who is calling? ────────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (token.length === 0) {
    return errorResponse('unauthorized', 'Sign in to search for products.', 401);
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return errorResponse('unauthorized', 'Your session is no longer valid. Sign in again.', 401);
  }

  // ── 2. Validate the request body ──────────────────────────────────────────
  let rawQuery: string;
  try {
    const body = (await request.json()) as { query?: unknown };
    if (typeof body.query !== 'string') {
      return errorResponse('invalid_request', 'Expected a "query" string.', 400);
    }
    rawQuery = body.query.trim();
  } catch {
    return errorResponse('invalid_request', 'Expected a JSON body.', 400);
  }

  if (rawQuery.length === 0) {
    return errorResponse('invalid_request', 'Describe what you are looking for.', 400);
  }
  if (rawQuery.length > MAX_QUERY_LENGTH) {
    return errorResponse(
      'invalid_request',
      `Please keep the description under ${MAX_QUERY_LENGTH} characters.`,
      400,
    );
  }

  // ── 3. Rate limit ─────────────────────────────────────────────────────────
  const limited = await checkRateLimit(admin, user.id, config.rateLimitPerHour);
  if (limited !== null) {
    return errorResponse(
      'rate_limited',
      `Search limit reached (${config.rateLimitPerHour} per hour).`,
      429,
      limited,
    );
  }

  // ── 4. Interpret the description ──────────────────────────────────────────
  let expanded: ExpandedQuery;
  try {
    expanded = config.anthropicApiKey
      ? await expandQuery(rawQuery, config.anthropicApiKey)
      : // Development affordance only — see expand-query.ts.
        devFallbackExpansion(rawQuery);
  } catch (cause) {
    if (cause instanceof ExpansionError) {
      return errorResponse('interpretation_error', cause.message, 502);
    }
    console.error('Unexpected expansion failure:', cause);
    return errorResponse('internal_error', 'Could not interpret that description.', 500);
  }

  // ── 5. Fetch candidates (cache first) ─────────────────────────────────────
  let provider;
  try {
    provider = resolveProvider(config);
  } catch (cause) {
    console.error('Provider setup failed:', cause);
    return errorResponse('provider_error', 'Product data source is unavailable.', 503);
  }

  const cacheKey = cacheKeyFor(provider.name, config.amazonDomain, expanded.keywords);
  let candidates = await readCache(admin, cacheKey);
  const cached = candidates !== null;

  if (candidates === null) {
    try {
      candidates = await provider.search(expanded.keywords, {
        domain: config.amazonDomain,
        associateTag: config.associateTag,
        limit: CANDIDATE_LIMIT,
      });
    } catch (cause) {
      console.error('Provider search failed:', cause);
      const message = cause instanceof ProviderError
        ? cause.message
        : 'Could not reach the Amazon product data source.';
      return errorResponse('provider_error', message, 503);
    }

    if (candidates.length > 0) {
      await writeCache(admin, cacheKey, provider.name, candidates, config.cacheTtlSeconds);
    }
  }

  // ── 6. Rank ───────────────────────────────────────────────────────────────
  const results = rankProducts(candidates, expanded);

  // ── 7. Persist ────────────────────────────────────────────────────────────
  // An empty result set is still a real search worth recording, so history
  // reflects what the user actually tried.
  const searchId = await persistSearch(admin, {
    userId: user.id,
    rawQuery,
    expanded,
    provider: provider.name,
    candidateCount: candidates.length,
    results,
    cached,
  });

  if (searchId === null) {
    return errorResponse('internal_error', 'Could not save your search.', 500);
  }

  await maybePurgeExpired(admin);

  const body: RecommendResponse = {
    searchId,
    query: rawQuery,
    expanded,
    results,
    meta: {
      candidateCount: candidates.length,
      scoredCount: results.length,
      provider: provider.name,
      cached,
    },
  };

  return jsonResponse(body, 200);
});

/**
 * Returns `null` when the caller is under the limit, otherwise the number of
 * seconds until their oldest in-window search ages out.
 */
async function checkRateLimit(
  admin: SupabaseClient,
  userId: string,
  limitPerHour: number,
): Promise<number | null> {
  const windowStart = new Date(Date.now() - RATE_WINDOW_SECONDS * 1000);

  const { data, error } = await admin
    .from('searches')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(limitPerHour);

  // Never lock a user out because the rate-limit check itself failed.
  if (error || !data || data.length < limitPerHour) return null;

  const oldest = data[data.length - 1] as { created_at: string } | undefined;
  if (!oldest) return null;

  const elapsedSeconds = (Date.now() - new Date(oldest.created_at).getTime()) / 1000;
  return Math.max(1, Math.ceil(RATE_WINDOW_SECONDS - elapsedSeconds));
}

interface PersistArgs {
  userId: string;
  rawQuery: string;
  expanded: ExpandedQuery;
  provider: string;
  candidateCount: number;
  results: RankedProduct[];
  cached: boolean;
}

/** Insert the search and its ranked results. Returns the search id, or null. */
async function persistSearch(admin: SupabaseClient, args: PersistArgs): Promise<string | null> {
  const { data, error } = await admin
    .from('searches')
    .insert({
      user_id: args.userId,
      raw_query: args.rawQuery,
      expanded_query: args.expanded,
      provider: args.provider,
      candidate_count: args.candidateCount,
      scored_count: args.results.length,
      cached: args.cached,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Failed to insert search:', error?.message);
    return null;
  }

  const searchId = (data as { id: string }).id;
  if (args.results.length === 0) return searchId;

  const rows = args.results.map((product) => ({
    search_id: searchId,
    user_id: args.userId,
    rank: product.rank,
    asin: product.asin,
    title: product.title,
    image_url: product.imageUrl,
    product_url: product.productUrl,
    price_cents: product.priceCents,
    currency: product.currency,
    rating: product.rating,
    review_count: product.reviewCount,
    score: product.score,
    score_breakdown: product.breakdown,
  }));

  const { error: resultsError } = await admin.from('search_results').insert(rows);
  if (resultsError) {
    // The search row exists and the caller still gets its results; only the
    // history record is incomplete, which is not worth failing the request.
    console.error('Failed to insert search_results:', resultsError.message);
  }

  return searchId;
}
