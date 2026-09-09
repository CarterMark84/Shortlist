import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { requireSupabaseEnv } from '../env';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * `cookies()` is async-only in Next 16, so this must be awaited. Cookie writes
 * throw when attempted from a Server Component (only Server Actions and Route
 * Handlers may set them), which is expected and safely ignored — token refresh
 * happens in proxy.ts instead.
 */
export async function createClient() {
  /*
   * Order matters. Reading cookies() is what opts the calling route into
   * dynamic rendering — so it must happen BEFORE the env check. With the
   * check first, an unconfigured build threw while Next still believed the
   * route was static, turning a missing .env.local into a build failure
   * instead of a runtime message.
   */
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — proxy.ts refreshes the session.
        }
      },
    },
  });
}

/**
 * The signed-in user, or null.
 *
 * Always uses `getUser()` (which validates the token with Supabase) rather
 * than reading the unverified cookie payload.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * The caller's access token, for forwarding to the edge function.
 *
 * `getSession()` is the only way to read the token itself; identity checks
 * still go through `getUser()`.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
