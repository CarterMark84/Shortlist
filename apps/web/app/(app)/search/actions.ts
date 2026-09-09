'use server';

import { redirect } from 'next/navigation';

import { describeApiError, requestRecommendations } from '@recs/shared';

import { supabaseAnonKey, supabaseUrl } from '@/lib/env';
import { getAccessToken } from '@/lib/supabase/server';
import type { SearchFormState } from './form-state';

/**
 * Run a search, then navigate to its results.
 *
 * Calling the edge function from the server keeps the round trip on one hop
 * and means the browser never needs the access token. The results are
 * persisted, so /search/[id] is a real, revisitable page.
 */
export async function runSearch(
  _previous: SearchFormState,
  formData: FormData,
): Promise<SearchFormState> {
  const query = String(formData.get('query') ?? '').trim();

  if (query.length === 0) {
    return { error: 'Describe what you are looking for first.', query };
  }
  if (query.length > 500) {
    return { error: 'Please keep the description under 500 characters.', query };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) redirect('/sign-in?next=/search');

  let searchId: string;
  try {
    const response = await requestRecommendations(query, {
      supabaseUrl,
      anonKey: supabaseAnonKey,
      accessToken,
    });
    searchId = response.searchId;
  } catch (cause) {
    return { error: describeApiError(cause), query };
  }

  // Must sit outside the try: redirect() signals by throwing, and a catch
  // above would swallow it.
  redirect(`/search/${searchId}`);
}
