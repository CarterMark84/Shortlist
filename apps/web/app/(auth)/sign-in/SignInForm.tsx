'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Alert } from '@/components/auth/Alert';
import { Field } from '@/components/auth/Field';
import { SubmitButton } from '@/components/auth/SubmitButton';

import { signIn } from '../actions';
import { initialAuthState } from '../form-state';

export function SignInForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signIn, initialAuthState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={state.email}
        autoFocus
      />

      <div>
        <Field
          id="password"
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <div className="mt-2 text-right">
          <Link
            href="/forgot-password"
            className="rounded text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Forgot your password?
          </Link>
        </div>
      </div>

      <SubmitButton label="Sign in" pendingLabel="Signing in…" />

      <p className="text-center text-sm text-ink-muted">
        No account yet?{' '}
        <Link
          href="/sign-up"
          className="rounded font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
