'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Alert } from '@/components/auth/Alert';
import { Field } from '@/components/auth/Field';
import { SubmitButton } from '@/components/auth/SubmitButton';

import { requestPasswordReset } from '../actions';
import { initialAuthState } from '../form-state';

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialAuthState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.notice && <Alert tone="success">{state.notice}</Alert>}

      {!state.notice && (
        <>
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
          <SubmitButton label="Send reset link" pendingLabel="Sending…" />
        </>
      )}

      <p className="text-center text-sm text-ink-muted">
        <Link
          href="/sign-in"
          className="rounded font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
