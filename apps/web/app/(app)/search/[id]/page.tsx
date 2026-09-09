import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  formatPrice,
  formatRelativeTime,
  SELECT_SEARCH,
  SELECT_SEARCH_RESULT,
} from '@recs/shared';

import { ProductCard } from '@/components/ProductCard';
import { createClient } from '@/lib/supabase/server';
import { fromResultRow, type SearchResultRow, type SearchRow } from '@/lib/db';

export const metadata: Metadata = { title: 'Recommendations' };

export default async function ResultsPage({
  params,
}: {
  // `params` is a Promise in Next 16 — synchronous access was removed.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS means a search belonging to somebody else simply is not found.
  const { data: searchData } = await supabase
    .from('searches')
    .select(SELECT_SEARCH)
    .eq('id', id)
    .maybeSingle();

  if (!searchData) notFound();
  const search = searchData as SearchRow;

  const [{ data: resultData }, { data: savedData }] = await Promise.all([
    supabase
      .from('search_results')
      .select(SELECT_SEARCH_RESULT)
      .eq('search_id', id)
      .order('rank', { ascending: true }),
    supabase.from('saved_products').select('asin'),
  ]);

  const products = ((resultData ?? []) as SearchResultRow[]).map(fromResultRow);
  const savedAsins = new Set(((savedData ?? []) as Array<{ asin: string }>).map((row) => row.asin));

  const expanded = search.expanded_query;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        New search
      </Link>

      <header className="mt-5">
        <p className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">You asked for</p>
        <h1 className="mt-1.5 text-2xl leading-snug font-semibold tracking-tight text-ink sm:text-3xl">
          {search.raw_query}
        </h1>
      </header>

      {/* What the interpretation step made of it — shown so the user can tell
          whether a poor result set is a bad search or a bad reading. */}
      {expanded?.interpretation && (
        <section className="mt-5 rounded-xl border border-accent-border bg-accent-subtle p-4">
          <h2 className="text-xs font-semibold tracking-wide text-accent uppercase">
            Understood as
          </h2>
          <p className="mt-1.5 leading-relaxed text-ink">{expanded.interpretation}</p>

          <dl className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {expanded.keywords && (
              <div className="flex items-baseline gap-1.5">
                <dt className="text-ink-muted">Searched Amazon for</dt>
                <dd className="font-mono text-[0.85em] font-medium text-ink">
                  {expanded.keywords}
                </dd>
              </div>
            )}

            {expanded.mustHave && expanded.mustHave.length > 0 && (
              <div className="flex flex-wrap items-baseline gap-1.5">
                <dt className="text-ink-muted">Must have</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {expanded.mustHave.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full border border-accent-border bg-surface px-2 py-0.5 text-xs font-medium text-ink"
                    >
                      {feature}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {(expanded.budgetMinCents != null || expanded.budgetMaxCents != null) && (
              <div className="flex items-baseline gap-1.5">
                <dt className="text-ink-muted">Budget</dt>
                <dd className="nums font-medium text-ink">
                  {expanded.budgetMinCents != null && expanded.budgetMaxCents != null
                    ? `${formatPrice(expanded.budgetMinCents)} – ${formatPrice(expanded.budgetMaxCents)}`
                    : expanded.budgetMaxCents != null
                      ? `up to ${formatPrice(expanded.budgetMaxCents)}`
                      : `from ${formatPrice(expanded.budgetMinCents!)}`}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <p className="nums mt-5 text-sm text-ink-subtle">
        {products.length > 0
          ? `Top ${products.length} of ${search.candidate_count} candidates considered`
          : `${search.candidate_count} candidates considered`}
        {' · '}
        {formatRelativeTime(search.created_at)}
        {search.provider === 'fixtures' && (
          <>
            {' · '}
            <span className="rounded bg-surface-muted px-1.5 py-0.5 font-medium text-ink-muted">
              offline sample data
            </span>
          </>
        )}
      </p>

      {products.length > 0 ? (
        <ol className="mt-6 space-y-4">
          {products.map((product) => (
            <li key={product.asin}>
              <ProductCard product={product} isSaved={savedAsins.has(product.asin)} />
            </li>
          ))}
        </ol>
      ) : (
        <EmptyResults candidateCount={search.candidate_count} />
      )}
    </div>
  );
}

/**
 * Finding nothing is not an error, so the page still renders and explains
 * which of the two possible reasons applies.
 */
function EmptyResults({ candidateCount }: { candidateCount: number }) {
  const amazonReturnedNothing = candidateCount === 0;

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface p-8 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </span>

      <h2 className="mt-4 text-lg font-semibold text-ink">No recommendations for this one</h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        {amazonReturnedNothing
          ? 'Amazon returned no products for those search terms. Try describing the product a little differently — a more common name for it often helps.'
          : `We looked at ${candidateCount} products, but none cleared the quality bar (at least 10 reviews and a 3-star rating). Try broadening the description or relaxing any price limit you mentioned.`}
      </p>

      <Link
        href="/search"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        Try another search
      </Link>
    </div>
  );
}
