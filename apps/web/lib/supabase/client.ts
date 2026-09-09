'use client';

import { createBrowserClient } from '@supabase/ssr';

import { requireSupabaseEnv } from '../env';

/**
 * Browser Supabase client, used for saving or unsaving products from a Client
 * Component.
 *
 * `createBrowserClient` memoizes internally, so calling this per component is
 * cheap and returns the same underlying client.
 */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
