import type { Metadata } from 'next';
import Link from 'next/link';

import { formatRelativeTime, SELECT_SEARCH } from '@recs/shared';

import { createClient } from '@/lib/supabase/server';
import type { SearchRow } from '@/lib/db';
import { deleteSearch } from './actions';

export const metadata: Metadata = { title: 'History' };

export default async function HistoryPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('searches')
    .select(SELECT_SEARCH)
    .order('created_at', { ascending: false })
    .limit(100);

  const searches = (data ?? []) as SearchRow[];

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Search history</h1>
        <p className="mt-2 text-ink-muted">
          Every search you have run, with the recommendations it produced.
        </p>
      </header>

      {searches.length === 0 ? (
        <div className="mt-8 rounded-xl border border-line bg-surface p-8 text-center">
          <h2 className="font-semibold text-ink">Nothing here yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Your searches will appear here once you have run one.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            Run your first search
          </Link>
        </div>
      ) : (
        <ul className="mt-7 space-y-3">
          {searches.map((search) => (
            <li
              key={search.id}
              className="group rounded-xl border border-line bg-surface transition-colors hover:border-line-strong"
            >
              <div className="flex items-center gap-3 p-4">
                <Link href={`/search/${search.id}`} className="min-w-0 flex-1 rounded">
                  <span className="block font-medium text-ink">{search.raw_query}</span>

                  {search.expanded_query?.keywords && (
                    <span className="mt-1 block truncate font-mono text-xs text-ink-subtle">
                      → {search.expanded_query.keywords}
                    </span>
                  )}

                  <span className="nums mt-1.5 block text-xs text-ink-subtle">
                    {formatRelativeTime(search.created_at)}
                    {' · '}
                    {search.scored_count === 0
                      ? 'no matches'
                      : `${search.scored_count} recommendation${search.scored_count === 1 ? '' : 's'}`}
                    {' · '}
                    {search.candidate_count} considered
                    {search.cached && ' · cached'}
                  </span>
                </Link>

                <form action={deleteSearch} className="shrink-0">
                  <input type="hidden" name="id" value={search.id} />
                  <button
                    type="submit"
                    aria-label={`Delete search: ${search.raw_query}`}
                    className="rounded-md p-2 text-ink-subtle transition-colors hover:bg-danger-subtle hover:text-danger"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
