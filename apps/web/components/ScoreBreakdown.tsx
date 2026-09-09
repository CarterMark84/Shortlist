import { formatPercent, formatRating, WEIGHTS, type ScoreBreakdown as Breakdown } from '@recs/shared';

/**
 * "Why this ranked here" disclosure.
 *
 * A ranked list the user cannot interrogate is just an assertion, so every
 * card can show exactly which signals earned its position. Built on <details>
 * so it works before hydration and needs no client JavaScript.
 */
export function ScoreBreakdown({
  breakdown,
  score,
  rank,
}: {
  breakdown: Breakdown;
  score: number;
  rank: number | null;
}) {
  const signals = [
    {
      label: 'Relevance to your request',
      raw: breakdown.relevance,
      weight: WEIGHTS.relevance,
      contribution: breakdown.weighted.relevance,
      note: 'How closely the listing matches what you described.',
    },
    {
      label: 'Customer rating',
      raw: breakdown.ratingComponent,
      weight: WEIGHTS.rating,
      contribution: breakdown.weighted.rating,
      note: `${formatRating(breakdown.adjustedRating)}★ after adjusting for how many people have rated it.`,
    },
    {
      label: 'Number of reviews',
      raw: breakdown.reviewVolume,
      weight: WEIGHTS.reviewVolume,
      contribution: breakdown.weighted.reviewVolume,
      note: 'Log-scaled against the other candidates for this search.',
    },
    {
      label: 'Price',
      raw: breakdown.priceValue,
      weight: WEIGHTS.priceValue,
      contribution: breakdown.weighted.priceValue,
      note: 'Relative to the price range of everything else considered.',
    },
  ];

  return (
    <details className="group mt-3">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-ink-muted transition-colors hover:text-ink">
        <svg
          className="transition-transform group-open:rotate-90"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
        Why this ranked {rank !== null ? `#${rank}` : 'here'}
      </summary>

      <div className="mt-3 rounded-lg border border-line bg-surface-muted p-3.5">
        <ul className="space-y-3">
          {signals.map((signal) => (
            <li key={signal.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">{signal.label}</span>
                <span className="nums shrink-0 text-xs text-ink-muted">
                  {formatPercent(signal.raw)} × {formatPercent(signal.weight)} weight
                </span>
              </div>

              <div
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(1, Math.round(signal.raw * 100))}%` }}
                />
              </div>

              <p className="mt-1 text-xs text-ink-subtle">{signal.note}</p>
            </li>
          ))}
        </ul>

        <div className="mt-3.5 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm font-semibold text-ink">Overall score</span>
          <span className="nums text-sm font-semibold text-ink">{formatPercent(score)}</span>
        </div>
      </div>
    </details>
  );
}
