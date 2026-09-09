'use client';

import { useActionState } from 'react';

import { Alert } from '@/components/auth/Alert';
import { Field } from '@/components/auth/Field';
import { SubmitButton } from '@/components/auth/SubmitButton';

import { updatePassword } from '../actions';
import { initialAuthState } from '../form-state';

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initialAuthState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field
        id="password"
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        hint="At least 8 characters."
        autoFocus
      />

      <Field
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
      />

      <SubmitButton label="Set new password" pendingLabel="Saving…" />
    </form>
  );
}
