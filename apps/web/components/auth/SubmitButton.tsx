'use client';

import { useFormStatus } from 'react-dom';

/**
 * Submit button that reads its own pending state from the enclosing form, so
 * the pending flag never has to be threaded down from useActionState.
 */
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover active:bg-accent-pressed disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending && (
        <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      )}
      {pending ? pendingLabel : label}
    </button>
  );
}
