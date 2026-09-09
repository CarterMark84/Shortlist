import Link from 'next/link';

/**
 * Wordmark. The mark is five ascending bars — a visual nod to a ranked
 * shortlist of five.
 */
export function Logo({ href = '/search' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-md"
      aria-label="Shortlist — home"
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-md bg-accent"
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          {[
            { x: 1, h: 5 },
            { x: 5, h: 8 },
            { x: 9, h: 11 },
            { x: 13, h: 14 },
          ].map(({ x, h }) => (
            <rect
              key={x}
              x={x}
              y={16 - h}
              width="2.5"
              height={h}
              rx="1.25"
              fill="var(--on-accent)"
              opacity={0.55 + (h / 14) * 0.45}
            />
          ))}
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-ink">Shortlist</span>
    </Link>
  );
}
