import Image from 'next/image';

import { formatPrice } from '@recs/shared';

import type { DisplayProduct } from '@/lib/db';
import { SaveButton } from './SaveButton';
import { ScoreBreakdown } from './ScoreBreakdown';
import { StarRating } from './StarRating';

/**
 * A single recommendation.
 *
 * Everything the user needs to judge and act on the product, in the priority
 * order they gave: what it is, what people think of it, what it costs, and a
 * direct route to buying it on Amazon.
 */
export function ProductCard({
  product,
  isSaved,
}: {
  product: DisplayProduct;
  isSaved: boolean;
}) {
  const isTop = product.rank === 1;

  return (
    <article
      className={`relative rounded-xl border bg-surface transition-shadow hover:shadow-[0_8px_24px_-4px_rgb(28_25_23_/_0.10),0_2px_6px_-2px_rgb(28_25_23_/_0.06)] ${
        isTop ? 'border-accent-border' : 'border-line'
      }`}
    >
      {isTop && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold tracking-wide text-on-accent uppercase">
          Best match
        </span>
      )}

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
        {/* Rank + image */}
        <div className="flex shrink-0 items-start gap-4">
          {product.rank !== null && (
            <span
              className={`nums flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                isTop
                  ? 'bg-accent text-on-accent'
                  : 'border border-line-strong bg-surface text-ink-muted'
              }`}
              aria-label={`Rank ${product.rank}`}
            >
              {product.rank}
            </span>
          )}

          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted"
            tabIndex={-1}
            aria-hidden="true"
          >
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt=""
                width={120}
                height={120}
                className="h-[120px] w-[120px] object-contain"
                // Provider thumbnails are small and unoptimizable; skip the
                // optimizer rather than pay for a round trip.
                unoptimized
              />
            ) : (
              <span className="flex h-[120px] w-[120px] items-center justify-center text-ink-subtle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 15l4-4 4 4 3-3 4 4" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                </svg>
              </span>
            )}
          </a>
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <h3 className="text-base leading-snug font-medium text-ink">
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="clamp-2 rounded transition-colors hover:text-accent"
              title={product.title}
            >
              {product.title}
            </a>
          </h3>

          <div className="mt-2">
            <StarRating rating={product.rating} reviewCount={product.reviewCount} />
          </div>

          {product.breakdown && product.score !== null && (
            <ScoreBreakdown
              breakdown={product.breakdown}
              score={product.score}
              rank={product.rank}
            />
          )}
        </div>

        {/* Price + actions */}
        <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-line pt-4 sm:w-44 sm:flex-col sm:items-stretch sm:justify-start sm:border-t-0 sm:pt-0">
          <p className="nums text-2xl font-semibold tracking-tight text-ink">
            {formatPrice(product.priceCents, product.currency)}
          </p>

          <div className="flex flex-row gap-2 sm:flex-col">
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover active:bg-accent-pressed"
            >
              View on Amazon
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </a>

            <SaveButton product={product} initiallySaved={isSaved} />
          </div>
        </div>
      </div>
    </article>
  );
}
