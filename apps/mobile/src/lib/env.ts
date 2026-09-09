/**
 * Public environment access.
 *
 * Expo inlines `EXPO_PUBLIC_*` variables at build time. A fresh clone has
 * none, so the app shows setup guidance rather than crashing.
 */

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isConfigured =
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('YOUR-PROJECT-REF') &&
  supabaseAnonKey.length > 20;
