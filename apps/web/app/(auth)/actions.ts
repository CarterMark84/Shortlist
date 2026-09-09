'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import type { AuthFormState } from './form-state';


/** Minimum we enforce in the UI. Supabase's own floor is lower. */
const MIN_PASSWORD_LENGTH = 8;

function readCredentials(formData: FormData): { email: string; password: string } {
  return {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  };
}

function validate(email: string, password: string): string | null {
  if (email.length === 0) return 'Enter your email address.';
  // Deliberately loose: the real check is whether the email can receive mail.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That does not look like an email address.';
  if (password.length === 0) return 'Enter your password.';
  return null;
}

/** Absolute origin, honouring a reverse proxy, for building email links. */
async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  const forwardedHost = headerList.get('x-forwarded-host') ?? headerList.get('host');
  const forwardedProto = headerList.get('x-forwarded-proto') ?? 'http';
  return forwardedHost ? `${forwardedProto}://${forwardedHost}` : 'http://localhost:3000';
}

/** Only ever redirect to our own paths — never a caller-supplied absolute URL. */
function safeNext(raw: FormDataEntryValue | null): string {
  const value = String(raw ?? '');
  return value.startsWith('/') && !value.startsWith('//') ? value : '/search';
}

export async function signIn(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  const next = safeNext(formData.get('next'));

  const invalid = validate(email, password);
  if (invalid) return { error: invalid, notice: null, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase deliberately does not distinguish "no such user" from "wrong
    // password"; keep it that way so this cannot be used to enumerate accounts.
    const message =
      error.message === 'Invalid login credentials'
        ? 'That email and password do not match an account.'
        : error.message === 'Email not confirmed'
          ? 'Please confirm your email address first — check your inbox for the link.'
          : error.message;
    return { error: message, notice: null, email };
  }

  redirect(next);
}

export async function signUp(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  const displayName = String(formData.get('displayName') ?? '').trim();

  const invalid = validate(email, password);
  if (invalid) return { error: invalid, notice: null, email };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
      notice: null,
      email,
    };
  }
  if (password !== String(formData.get('confirmPassword') ?? '')) {
    return { error: 'The two passwords do not match.', notice: null, email };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/search`,
      // handle_new_user() reads full_name to populate profiles.display_name.
      data: displayName.length > 0 ? { full_name: displayName } : undefined,
    },
  });

  if (error) {
    const message = error.message.toLowerCase().includes('already registered')
      ? 'An account with that email already exists. Try signing in instead.'
      : error.message;
    return { error: message, notice: null, email };
  }

  // With email confirmation enabled Supabase returns a user but no session.
  // With it disabled the session arrives immediately and we can go straight in.
  if (data.session) redirect('/search');

  return {
    error: null,
    notice: `Almost there — we sent a confirmation link to ${email}. Click it to finish creating your account.`,
    email,
  };
}

export async function requestPasswordReset(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (email.length === 0) return { error: 'Enter your email address.', notice: null, email };

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Report success either way: revealing that an address has no account would
  // let anyone enumerate registered users.
  if (error && !error.message.toLowerCase().includes('not found')) {
    return { error: error.message, notice: null, email };
  }

  return {
    error: null,
    notice: `If an account exists for ${email}, a password reset link is on its way.`,
    email,
  };
}

export async function updatePassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get('password') ?? '');

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
      notice: null,
      email: '',
    };
  }
  if (password !== String(formData.get('confirmPassword') ?? '')) {
    return { error: 'The two passwords do not match.', notice: null, email: '' };
  }

  const supabase = await createClient();

  // The recovery link established a session via /auth/callback, so this
  // updates the password for whoever that link belonged to.
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return {
      error: 'This reset link has expired. Request a new one.',
      notice: null,
      email: '',
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message, notice: null, email: '' };

  redirect('/search');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/sign-in');
}
