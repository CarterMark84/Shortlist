'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Alert } from '@/components/auth/Alert';
import { Field } from '@/components/auth/Field';
import { SubmitButton } from '@/components/auth/SubmitButton';

import { signUp } from '../actions';
import { initialAuthState } from '../form-state';

export function SignUpForm() {
  const [state, formAction] = useActionState(signUp, initialAuthState);

  // Once the confirmation email is away, the form has nothing left to do.
  if (state.notice) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{state.notice}</Alert>
        <p className="text-sm leading-relaxed text-ink-muted">
          The link expires after a while — if it does, just sign up again with the same address.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex w-full items-center justify-center rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field
        id="displayName"
        name="displayName"
        label="Name"
        autoComplete="name"
        placeholder="Your name"
        required={false}
        hint="Optional — shown in the header."
        autoFocus
      />

      <Field
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={state.email}
      />

      <Field
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        hint="At least 8 characters."
      />

      <Field
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
      />

      <SubmitButton label="Create account" pendingLabel="Creating account…" />

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="rounded font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
