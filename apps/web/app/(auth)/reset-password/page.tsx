import type { Metadata } from 'next';
import Link from 'next/link';

import { getCurrentUser } from '@/lib/supabase/server';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = { title: 'Choose a new password' };

/**
 * Landing page for a password recovery link.
 *
 * /auth/callback has already exchanged the recovery code for a session by the
 * time we get here, so an authenticated user means the link was valid.
 */
export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Link expired</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Password reset links are single-use and time-limited. Request a fresh one and try again.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          Request a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Choose a new password</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Setting a new password for <span className="font-medium text-ink">{user.email}</span>.
      </p>

      <div className="mt-6">
        <ResetPasswordForm />
      </div>
    </>
  );
}
