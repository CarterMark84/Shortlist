import type { Metadata } from 'next';
import Link from 'next/link';

import { formatRelativeTime, SELECT_SAVED_PRODUCT } from '@recs/shared';

import { ProductCard } from '@/components/ProductCard';
import { createClient } from '@/lib/supabase/server';
import { fromSavedRow, type SavedProductRow } from '@/lib/db';

export const metadata: Metadata = { title: 'Saved' };

export default async function SavedPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('saved_products')
    .select(SELECT_SAVED_PRODUCT)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as SavedProductRow[];

  // A snapshot written by an older schema could be unreadable; drop those
  // rather than render a broken card.
  const saved = rows
    .map((row) => ({ row, product: fromSavedRow(row) }))
    .filter((entry): entry is { row: SavedProductRow; product: NonNullable<typeof entry.product> } =>
      entry.product !== null,
    );

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Saved products</h1>
        <p className="mt-2 text-ink-muted">
          Prices and ratings shown are as they were when you saved each item.
        </p>
      </header>

      {saved.length === 0 ? (
        <div className="mt-8 rounded-xl border border-line bg-surface p-8 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          </span>
          <h2 className="mt-4 font-semibold text-ink">No saved products</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Use the Save button on any recommendation to keep it here for later.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            Find something
          </Link>
        </div>
      ) : (
        <ul className="mt-7 space-y-4">
          {saved.map(({ row, product }) => (
            <li key={row.id}>
              <p className="nums mb-1.5 text-xs text-ink-subtle">
                Saved {formatRelativeTime(row.created_at)}
              </p>
              <ProductCard product={product} isSaved />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
