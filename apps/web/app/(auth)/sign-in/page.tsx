import type { Metadata } from 'next';

import { SignInForm } from './SignInForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage({
  searchParams,
}: {
  // searchParams is a Promise in Next 16 — synchronous access was removed.
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;

  // Never hand a caller-supplied absolute URL to a post-login redirect.
  const next =
    params.next && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/search';

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Sign in to Shortlist</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Your searches and saved products stay tied to your account.
      </p>

      {params.notice && (
        <p className="mt-5 rounded-lg bg-success-subtle px-3.5 py-2.5 text-sm text-success">
          {params.notice}
        </p>
      )}
      {params.error && (
        <p role="alert" className="mt-5 rounded-lg bg-danger-subtle px-3.5 py-2.5 text-sm text-danger">
          {params.error}
        </p>
      )}

      <div className="mt-6">
        <SignInForm next={next} />
      </div>
    </>
  );
}
