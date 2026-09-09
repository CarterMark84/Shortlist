'use client';

import { useState, useTransition } from 'react';

import { createClient } from '@/lib/supabase/client';
import { toSnapshot, type DisplayProduct } from '@/lib/db';

/**
 * Save / unsave a product.
 *
 * Writes go straight to Postgres from the browser — RLS scopes the row to the
 * signed-in user, so no endpoint of our own is needed. Updates optimistically
 * and rolls back if the write fails.
 */
export function SaveButton({
  product,
  initiallySaved,
}: {
  product: DisplayProduct;
  initiallySaved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next);
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

      if (!userId) {
        setSaved(!next);
        setError('Session expired');
        return;
      }

      const { error: writeError } = next
        ? await supabase.from('saved_products').upsert(
            { user_id: userId, asin: product.asin, snapshot: toSnapshot(product) },
            { onConflict: 'user_id,asin' },
          )
        : await supabase.from('saved_products').delete().eq('user_id', userId).eq('asin', product.asin);

      if (writeError) {
        setSaved(!next); // roll back
        setError('Could not save');
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          saved
            ? 'border-accent-border bg-accent-subtle text-accent'
            : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
        }`}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
        {saved ? 'Saved' : 'Save'}
      </button>

      {error && (
        <span role="alert" className="text-center text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
