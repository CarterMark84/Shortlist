/**
 * Skeleton for the results page.
 *
 * The search itself already blocked for a few seconds in the server action, so
 * this mostly covers navigation back to a previously-run search — but it keeps
 * the layout from jumping either way.
 */
export default function LoadingResults() {
  return (
    <div className="mx-auto max-w-4xl" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading recommendations…</span>

      <Bar className="h-4 w-28" />
      <Bar className="mt-6 h-3 w-20" />
      <Bar className="mt-3 h-8 w-3/4" />
      <Bar className="mt-5 h-24 w-full rounded-xl" />
      <Bar className="mt-5 h-3 w-56" />

      <div className="mt-6 space-y-4">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="rounded-xl border border-line bg-surface p-5">
            <div className="flex gap-5">
              <Bar className="h-[120px] w-[120px] shrink-0 rounded-lg" />
              <div className="flex-1">
                <Bar className="h-4 w-full" />
                <Bar className="mt-2 h-4 w-2/3" />
                <Bar className="mt-4 h-4 w-40" />
                <Bar className="mt-5 h-3 w-32" />
              </div>
              <div className="hidden w-44 shrink-0 flex-col gap-3 sm:flex">
                <Bar className="h-7 w-24" />
                <Bar className="h-9 w-full rounded-lg" />
                <Bar className="h-9 w-full rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-surface-muted ${className}`} />;
}
