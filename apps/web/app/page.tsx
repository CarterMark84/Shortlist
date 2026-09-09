import Link from 'next/link';

import { EXAMPLE_PROMPTS } from '@recs/shared';

import { Logo } from '@/components/Logo';
import { SetupNotice } from '@/components/SetupNotice';
import { isConfigured } from '@/lib/env';

/**
 * Landing page. Signed-in visitors never reach this — proxy.ts sends them to
 * /search — so this is purely for first-time and signed-out visitors.
 */
export default function LandingPage() {
  if (!isConfigured) return <SetupNotice />;

  return (
    <main className="mx-auto max-w-(--container-content) px-6 py-8">
      <div className="flex items-center justify-between">
        <Logo href="/" />
        <Link
          href="/sign-in"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          Sign in
        </Link>
      </div>

      <section className="mx-auto max-w-3xl py-20 text-center sm:py-28">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          Product recommendations
        </p>

        <h1 className="mt-4 text-4xl leading-[1.1] font-semibold tracking-tight text-ink sm:text-5xl">
          Describe what you need.
          <br />
          Get the five best options.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
          You do not need to know what the product is called. Say it however it comes out, and
          Shortlist finds the five strongest matches on Amazon — ranked on relevance, customer
          rating, review volume and price.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            Get started
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <span className="text-sm text-ink-subtle">Free account, email and password.</span>
        </div>
      </section>

      <section className="mx-auto max-w-2xl pb-24">
        <h2 className="text-center text-sm font-semibold tracking-wide text-ink-subtle uppercase">
          Things people ask for
        </h2>
        <ul className="mt-6 space-y-2.5">
          {EXAMPLE_PROMPTS.slice(0, 4).map((prompt) => (
            <li
              key={prompt}
              className="rounded-lg border border-line bg-surface px-4 py-3 text-ink-muted"
            >
              <span className="mr-2 text-ink-subtle" aria-hidden="true">
                &ldquo;
              </span>
              {prompt}
              <span className="ml-1 text-ink-subtle" aria-hidden="true">
                &rdquo;
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-4xl gap-6 pb-24 sm:grid-cols-3">
        {[
          {
            title: 'Ranked, not listed',
            body: 'One blended score across relevance, rating, review volume and price — and every card shows you the maths behind its position.',
          },
          {
            title: 'Ratings you can trust',
            body: 'A five-star product with six reviews will not outrank a 4.6 with twenty thousand. Ratings are weighted by how much evidence backs them.',
          },
          {
            title: 'Buy on Amazon',
            body: 'Each recommendation links straight to the Amazon product page, where you check out with your own account as usual.',
          },
        ].map((feature) => (
          <div key={feature.title}>
            <h3 className="font-semibold text-ink">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
