import type { Metadata } from 'next';

import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Reset your password</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Enter your email and we will send you a link to choose a new password.
      </p>

      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
    </>
  );
}
