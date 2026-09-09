/**
 * Provider-result cache.
 *
 * SerpApi's free tier is 250 searches a month, so two people asking for the
 * same thing must not cost two calls. Amazon prices move faster than ratings
 * do; a few hours is a sensible compromise (default 6h, `QUERY_CACHE_TTL_SECONDS`).
 *
 * The table is service-role only (RLS on, no policies), so nothing here is
 * reachable from a client.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

import type { ProductCandidate } from './core/types.ts';
import { tokenize } from './core/ranking.ts';

/**
 * Cache key: provider + marketplace + the query's *sorted* significant tokens.
 *
 * Sorting means "travel insulated mug" and "insulated mug travel" share a cache
 * entry, which they should — they retrieve the same shelf.
 */
export function cacheKeyFor(provider: string, domain: string, keywords: string): string {
  const tokens = [...new Set(tokenize(keywords))].sort();
  return `${provider}:${domain}:${tokens.join('+')}`;
}

/** Returns cached candidates, or null on a miss / expiry / any cache failure. */
export async function readCache(
  admin: SupabaseClient,
  cacheKey: string,
): Promise<ProductCandidate[] | null> {
  const { data, error } = await admin
    .from('query_cache')
    .select('payload')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  // A cache problem must never fail the request — fall through to a live call.
  if (error || !data) return null;

  const payload = (data as { payload: unknown }).payload;
  return Array.isArray(payload) ? (payload as ProductCandidate[]) : null;
}

/** Store candidates for reuse. Failures are logged and swallowed. */
export async function writeCache(
  admin: SupabaseClient,
  cacheKey: string,
  provider: string,
  candidates: ProductCandidate[],
  ttlSeconds: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const { error } = await admin.from('query_cache').upsert(
    {
      cache_key: cacheKey,
      provider,
      payload: candidates,
      expires_at: expiresAt,
    },
    { onConflict: 'cache_key' },
  );

  if (error) console.error('query_cache write failed:', error.message);
}

/**
 * Opportunistic housekeeping. Called on a small fraction of requests so the
 * table stays tidy without needing pg_cron.
 */
export async function maybePurgeExpired(admin: SupabaseClient, probability = 0.02): Promise<void> {
  if (Math.random() >= probability) return;
  const { error } = await admin.rpc('purge_expired_query_cache');
  if (error) console.error('query_cache purge failed:', error.message);
}
