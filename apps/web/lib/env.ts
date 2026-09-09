/**
 * Public environment access.
 *
 * A fresh clone has no `.env.local`, so rather than crash with a cryptic error
 * the app detects that and renders setup instructions. `isConfigured` is what
 * the landing page branches on.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;

/** True when both public Supabase values are present and plausibly real. */
export const isConfigured =
  url.startsWith('http') && !url.includes('YOUR-PROJECT-REF') && anonKey.length > 20;

/**
 * Throwing accessor for code paths that genuinely cannot proceed without
 * configuration (the Supabase clients).
 */
export function requireSupabaseEnv(): { url: string; anonKey: string } {
  if (!isConfigured) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to apps/web/.env.local and set ' +
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return { url, anonKey };
}
