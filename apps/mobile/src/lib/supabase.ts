// URL/URLSearchParams in React Native's Hermes runtime are incomplete;
// supabase-js relies on them, so the polyfill must load before it.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import { isConfigured, supabaseAnonKey, supabaseUrl } from './env';

/**
 * The mobile Supabase client.
 *
 * `detectSessionInUrl: false` is required on native — there is no browser URL
 * to read a session from, and leaving it on makes the client look for one and
 * clear the stored session.
 */
export const supabase: SupabaseClient = createClient(
  // Fall back to harmless placeholders so an unconfigured build can still
  // render its setup screen instead of throwing at import time.
  isConfigured ? supabaseUrl : 'http://localhost:54321',
  isConfigured ? supabaseAnonKey : 'public-anon-key-placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Refresh tokens only while the app is in the foreground.
 *
 * Without this the refresh timer keeps firing after backgrounding, which both
 * wastes battery and produces failed requests the OS has frozen.
 */
let subscribed = false;

export function registerAutoRefresh(): () => void {
  if (subscribed) return () => {};
  subscribed = true;

  const handleChange = (state: AppStateStatus) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  };

  // Seed from the current state — the listener only fires on transitions.
  handleChange(AppState.currentState);
  const subscription = AppState.addEventListener('change', handleChange);

  return () => {
    subscription.remove();
    subscribed = false;
  };
}
