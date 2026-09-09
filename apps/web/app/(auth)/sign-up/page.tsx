import type { Metadata } from 'next';

import { SignUpForm } from './SignUpForm';

export const metadata: Metadata = { title: 'Create an account' };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Create your account</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Free, and takes a moment. You will get the five best Amazon matches for anything you can
        describe.
      </p>

      <div className="mt-6">
        <SignUpForm />
      </div>
    </>
  );
}
