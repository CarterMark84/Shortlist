/**
 * Data access for the mobile app.
 *
 * Reads go straight to Postgres (RLS scopes every row to the signed-in user);
 * the one write that needs secrets — running a search — goes through the
 * `recommend` edge function.
 */

import {
  ApiError,
  fromResultRow,
  fromSavedRow,
  requestRecommendations,
  SELECT_SAVED_PRODUCT,
  SELECT_SEARCH,
  SELECT_SEARCH_RESULT,
  toSnapshot,
  type DisplayProduct,
  type SavedProductRow,
  type SearchResultRow,
  type SearchRow,
} from '@recs/shared';

import { supabaseAnonKey, supabaseUrl } from './env';
import { supabase } from './supabase';

export async function fetchRecentSearches(limit = 20): Promise<SearchRow[]> {
  const { data, error } = await supabase
    .from('searches')
    .select(SELECT_SEARCH)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SearchRow[];
}

export async function fetchSearch(id: string): Promise<SearchRow | null> {
  const { data, error } = await supabase
    .from('searches')
    .select(SELECT_SEARCH)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as SearchRow | null) ?? null;
}

export async function fetchResults(searchId: string): Promise<DisplayProduct[]> {
  const { data, error } = await supabase
    .from('search_results')
    .select(SELECT_SEARCH_RESULT)
    .eq('search_id', searchId)
    .order('rank', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as SearchResultRow[]).map(fromResultRow);
}

export async function fetchSavedAsins(): Promise<Set<string>> {
  const { data, error } = await supabase.from('saved_products').select('asin');
  if (error) throw new Error(error.message);
  return new Set(((data ?? []) as { asin: string }[]).map((row) => row.asin));
}

export interface SavedEntry {
  id: string;
  savedAt: string;
  product: DisplayProduct;
}

export async function fetchSaved(): Promise<SavedEntry[]> {
  const { data, error } = await supabase
    .from('saved_products')
    .select(SELECT_SAVED_PRODUCT)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const entries: SavedEntry[] = [];
  for (const row of (data ?? []) as unknown as SavedProductRow[]) {
    const product = fromSavedRow(row);
    // Skip snapshots too incomplete to render rather than crash the list.
    if (product) entries.push({ id: row.id, savedAt: row.created_at, product });
  }
  return entries;
}

/** Run a search. Resolves with the new search's id. */
export async function runSearch(query: string): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new ApiError('Your session expired. Please sign in again.', 'unauthorized', 401);
  }

  const response = await requestRecommendations(query, {
    supabaseUrl,
    anonKey: supabaseAnonKey,
    accessToken,
  });

  return response.searchId;
}

export async function setSaved(product: DisplayProduct, saved: boolean): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Not signed in.');

  const { error } = saved
    ? await supabase
        .from('saved_products')
        .upsert(
          { user_id: userId, asin: product.asin, snapshot: toSnapshot(product) },
          { onConflict: 'user_id,asin' },
        )
    : await supabase
        .from('saved_products')
        .delete()
        .eq('user_id', userId)
        .eq('asin', product.asin);

  if (error) throw new Error(error.message);
}

export async function deleteSearch(id: string): Promise<void> {
  const { error } = await supabase.from('searches').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
