import type { Metadata } from 'next';
import Link from 'next/link';

import { formatRelativeTime, SELECT_SEARCH } from '@recs/shared';

import { createClient } from '@/lib/supabase/server';
import type { SearchRow } from '@/lib/db';
import { SearchForm } from './SearchForm';

export const metadata: Metadata = { title: 'Search' };

export default async function SearchPage() {
  const supabase = await createClient();

  // RLS scopes this to the signed-in user; no user_id filter needed.
  const { data } = await supabase
    .from('searches')
    .select(SELECT_SEARCH)
    .order('created_at', { ascending: false })
    .limit(5);

  const recent = (data ?? []) as SearchRow[];

  return (
    <div className="mx-auto max-w-(--container-search) py-6 sm:py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          What are you looking for?
        </h1>
        <p className="mx-auto mt-3 max-w-lg leading-relaxed text-ink-muted">
          Describe it however it comes out — you do not need to know what it is called. You will get
          the five strongest matches on Amazon.
        </p>
      </div>

      <div className="mt-8">
        <SearchForm />
      </div>

      {recent.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-ink-subtle uppercase">
              Recent searches
            </h2>
            <Link
              href="/history"
              className="rounded text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              View all
            </Link>
          </div>

          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {recent.map((search) => (
              <li key={search.id}>
                <Link
                  href={`/search/${search.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{search.raw_query}</span>
                    <span className="nums mt-0.5 block text-xs text-ink-subtle">
                      {formatRelativeTime(search.created_at)} ·{' '}
                      {search.scored_count === 0
                        ? 'no matches'
                        : `${search.scored_count} recommendation${search.scored_count === 1 ? '' : 's'}`}
                    </span>
                  </span>
                  <svg
                    className="shrink-0 text-ink-subtle"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
