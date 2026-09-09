# Shortlist

Describe a product in plain language, get the five best-matching Amazon products — ranked on
relevance, customer rating, review volume and price.

Ships as a desktop web app (Next.js) and a cross-platform native mobile app (Expo / React Native),
both talking to one Supabase backend.

```
"something to keep my coffee hot on my long commute"
                     │
                     ▼
        Claude (claude-opus-5, structured output)
        → keywords: "insulated travel mug leakproof 16oz"
        → must have: ["leakproof lid"]
                     │
                     ▼
        Amazon search via provider  →  ~48 candidates
                     │
                     ▼
        Weighted ranking + Bayesian rating adjustment
                     │
                     ▼
              Top 5, with the maths shown
```

---

## Contents

- [Repository layout](#repository-layout)
- [How the ranking works](#how-the-ranking-works)
- [Setup](#setup)
- [Running it](#running-it)
- [Verifying it works](#verifying-it-works)
- [Design system](#design-system)
- [Known limitations](#known-limitations)

---

## Repository layout

```
├── apps/
│   ├── web/                  Next.js 16 (App Router) — desktop web
│   └── mobile/               Expo SDK 57 (Expo Router) — iOS + Android
├── packages/
│   └── shared/               ranking, types, formatters, design tokens, API client
├── supabase/
│   ├── migrations/           schema + row-level security
│   └── functions/recommend/  Claude → Amazon provider → rank → persist
└── scripts/
    ├── sync-shared.mjs       mirrors the pure core into the edge function
    └── gen-theme-css.mjs     generates the web app's CSS tokens
```

**One source of truth for logic.** The ranking algorithm lives only in
`packages/shared/src/ranking.ts`. Because npm workspace packages are not resolvable from a Supabase
function bundle, `npm run sync:shared` mirrors the dependency-free modules into
`supabase/functions/_shared/core/`. Those copies are generated — edit the source and re-run the
script. `npm run sync:shared:check` fails if they are stale, so wire it into CI.

**Secrets stay server-side.** The Anthropic and Amazon-provider keys exist only as Supabase
function secrets. Neither client bundle can see them, which is why both clients call one edge
function rather than the provider directly.

**Edge-function imports use `npm:` specifiers, not an import map.** `supabase functions deploy`
uploads the function's `.ts` files but *not* `supabase/functions/deno.json`, so a bare specifier
like `@supabase/supabase-js` fails remotely with "Relative import path not prefixed with / or ./ or
../". Versions are therefore pinned inline (`npm:@supabase/supabase-js@2.116.0`), which resolves
identically under local `deno check` and on deploy.

---

## How the ranking works

```
score = 0.40 · relevance
      + 0.25 · adjusted rating
      + 0.20 · review volume
      + 0.15 · price value
```

| Signal | How it is computed |
|---|---|
| **relevance** | Blend of the provider's own result position (against a fixed 48-result horizon) and how much of Claude's keyword and must-have list appears in the product title. Position is weighted below 50% deliberately: a listing matching none of the request should never coast to a high score on placement alone. |
| **adjusted rating** | Bayesian shrinkage toward the global mean: `(v/(v+m))·R + (m/(v+m))·C`, with `m = 50`, `C = 4.3`. |
| **review volume** | `log10(1+reviews)`, normalized across the surviving candidates. Log-scaled so a 200,000-review blockbuster does not flatten every other signal. |
| **price value** | Inverse price, normalized across the candidate set. Unpriced listings score a neutral 0.5 rather than being punished for a gap in provider data. |

**The guard that matters.** Bayesian shrinkage is what stops "highest rating" and "most reviews"
from fighting each other:

| Listing | Raw | Adjusted |
|---|---|---|
| 4.9★ from 6 reviews | 4.9 | **4.36** |
| 4.6★ from 20,431 reviews | 4.6 | **4.60** |

The heavily-reviewed 4.6 wins, which is the right answer. This is asserted directly in
`packages/shared/src/ranking.test.ts`.

Candidates are dropped before scoring if they are sponsored, unrated, below 10 reviews, rated under
3 stars, a duplicate ASIN, or outside a budget Claude inferred. Every weight and threshold is in the
exported `WEIGHTS` and `DEFAULT_RANKING_CONFIG` objects.

Each result card can show its own score breakdown, so a ranking is always interrogable rather than
merely asserted.

---

## Setup

### 0. Prerequisites

- **Node.js 20+** (built and tested on 24.19.0 LTS)
- **Supabase CLI** — bundled as a pinned dev dependency, so `npx supabase ...` just works after `npm install`. No global install needed.
- Optional: **Deno** for typechecking the edge function locally

Docker is *not* required: this targets a hosted Supabase project rather than the local stack.

```bash
npm install
```

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com). From
**Project Settings → API Keys**, copy the publishable key — labelled either `anon` `public`
(legacy JWT, starts `eyJhbGci...`) or **Publishable key** (`sb_publishable_...`). Either works.

```bash
npx supabase login                                    # or: export SUPABASE_ACCESS_TOKEN=sbp_...
npx supabase link --project-ref <your-project-ref>
npm run db:push                                       # applies supabase/migrations/
```

`db push` creates five tables — `profiles`, `searches`, `search_results`, `saved_products`,
`query_cache` — with row-level security on all of them. Every user-facing policy is
`user_id = auth.uid()`, so a user can only ever read their own rows. `query_cache` has RLS enabled
with *no* policies, which makes it reachable only by the service role.

**No CLI login handy?** Open the dashboard SQL Editor, paste the whole of
`supabase/migrations/20260908120000_init.sql`, and run it. Same result — 5 tables, 6 indexes,
11 RLS policies, 3 functions, 2 triggers — with no personal access token required. Do still run
`npx supabase link` later so future `db push` calls know the migration is already applied.

### 2. Environment files

Copy `.env.example` and fill in the same two values in both places:

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Both frameworks read env vars at startup, so restart the dev server after editing. Until these are
set, each app renders setup instructions instead of failing.

### 3. Deploy the edge function

```bash
npm run fn:deploy         # runs sync:shared, then deploys
```

It runs on **offline fixture data by default** — no API keys, no quota consumed — so you can build
and demo the whole app before signing up for anything. When you want live Amazon data:

```bash
supabase secrets set AMAZON_PROVIDER=serpapi
supabase secrets set SERPAPI_API_KEY=...        # serpapi.com — free tier is 250 searches/month
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Optional secrets: `AMAZON_DOMAIN` (default `amazon.com`), `AMAZON_ASSOCIATE_TAG` (appends your
Associates tag to outbound links), `SEARCH_RATE_LIMIT_PER_HOUR` (default 20),
`QUERY_CACHE_TTL_SECONDS` (default 6h).

> Without `ANTHROPIC_API_KEY` the function falls back to plain keyword extraction and says so in
> the interpretation text. That is a development affordance only — with a key present, a Claude
> failure surfaces as a real error rather than silently degrading every result.

### 4. Email sign-in

No OAuth clients, no extra environment variables. Auth lives at four routes: `/sign-in`,
`/sign-up`, `/forgot-password` and `/reset-password`.

The auth settings are declared in `supabase/config.toml` rather than left as dashboard clicks, so
one command applies them:

```bash
npm run config:diff     # preview what would change on the remote project
npm run config:push     # apply it
```

That sets the Site URL and allowed redirect URLs, raises the server-side minimum password length to
8 to match the UI, and — importantly — sets `enable_confirmations = false`.

**Why confirmations are off by default here:** Supabase's built-in mailer is rate-limited to a
handful of messages an hour and documented as test-only, so leaving confirmations on without your
own SMTP provider means sign-ups appear to work and then silently never arrive. Accounts are
usable immediately instead. Changing an existing account's email address still requires
confirmation (`double_confirm_changes = true`), since that protects a live account and is not on
the sign-up hot path.

**Before real users:** add an SMTP provider under Authentication → Emails, then flip
`enable_confirmations` back to `true` in `supabase/config.toml` and re-run `npm run config:push`.
The sign-up UI already handles both cases — it signs you straight in when a session comes back, and
shows "check your email" when it does not — so no code changes either way.

If you would rather click than push config: Authentication → Providers → Email → **Confirm email**,
and Authentication → URL Configuration → **Site URL**.

---
## Running it

```bash
npm run web        # http://localhost:3000
npm run mobile     # Expo dev server; press i / a, or scan with Expo Go
```

Other useful commands:

| Command | What it does |
|---|---|
| `npm run test` | Ranking and formatter unit tests |
| `npm run typecheck` | Typechecks every workspace |
| `npm run build` | Builds every workspace |
| `npm run gen:theme` | Regenerates the web CSS tokens from the shared theme |
| `npm run sync:shared:check` | Fails if the edge-function core copies are stale |
| `npm run fn:serve` | Runs the edge function locally |
| `npm run fn:check` | Typechecks the edge function with Deno |
| `npm run config:diff` | Previews auth/config changes against the linked project |
| `npm run config:push` | Applies `supabase/config.toml` to the linked project |

> **If a build dies with exit code `3221226505` / `VirtualAlloc failed`,** the machine is out of
> commit charge rather than anything being wrong with the code. Turbo fans tasks out across cores
> by default; `npx turbo run build test typecheck lint --concurrency=1` runs them one at a time and
> completes in roughly 1.3 GB of headroom.

---

## Verifying it works

### Automated

```bash
npm run test        # 60 tests: ranking correctness, filters, formatters
npm run typecheck   # shared + web + mobile
```

The ranking suite covers the weight split, log scaling, the budget filter, sponsored and
noise-floor exclusion, determinism, and the 4.9★/6-reviews-must-not-win guard case.

`npm run lint` additionally runs `scripts/check-server-actions.mjs`, which fails if a
`'use server'` file exports anything but an async function. Next rejects such a module at load
time — *"A 'use server' file can only export async functions, found object"* — turning every
action in it into an HTTP 500. But `next build` compiles it happily and typecheck passes, so
nothing else catches it.

> **Rendering a page is not the same as submitting its form.** A page can render perfectly while
> every action behind it returns a 500. Any change to a server action needs an actual submission
> test, not just a page fetch.

### The edge function directly

```bash
curl -X POST "$SUPABASE_URL/functions/v1/recommend" \
  -H "Authorization: Bearer $USER_JWT" \
  -H 'Content-Type: application/json' \
  -d '{"query":"something to keep my coffee hot on my long commute"}'
```

Expect at most 5 results in descending `score`, each carrying `imageUrl`, `productUrl`,
`priceCents`, `rating`, `reviewCount` and a `breakdown`. Grab a `USER_JWT` from your browser's
Application → Cookies after signing in, or from `supabase.auth.getSession()` in the console.

### Web, by hand

1. Visit `/search` signed out → redirected to `/sign-in`
2. Create an account at `/sign-up`, confirm by email if confirmation is on, then sign in
3. **Password reset:** `/forgot-password` → open the emailed link → set a new password at
   `/reset-password` → you land signed in on `/search`
4. Enter a deliberately vague description → five cards with image, price, rating, review count
5. Expand **Why this ranked #1** → the four weighted signals sum to the overall score
6. Click **View on Amazon** → the correct product page opens in a new tab
7. Save a product → it appears under `/saved`; the search appears under `/history`
8. **RLS proof:** sign in as a second user — `/history` and `/saved` must be empty

### Mobile, by hand

Same flow via `npm run mobile`. Also confirm the session survives an app restart (it is persisted
in AsyncStorage) and that Amazon links open in the in-app browser.

---

## Design system

All tokens live in `packages/shared/src/theme.ts` — warm stone neutrals, a single indigo accent, and
amber reserved exclusively for star ratings.

- **Mobile** imports the tokens directly via `useTheme()`.
- **Web** consumes them as CSS custom properties. Tailwind v4 configures itself from CSS rather
  than a JS config, so `npm run gen:theme` generates `apps/web/app/theme.generated.css` from the
  same module — semantic vars on `:root`, dark overrides for both the system preference and an
  explicit `data-theme`, mapped into Tailwind's namespace with `@theme inline`. That yields
  utilities like `bg-canvas`, `text-ink-muted` and `border-line`.

Both clients therefore read one palette, and star ratings use the same `starFills` helper so a 4.6
renders as four solid stars plus one 60%-filled star on every platform.

---

## Known limitations

**Amazon's official API is not usable here.** PA-API 5.0 was deprecated on 2026-04-30 and retired
on 2026-05-15. Its replacement, the Creators API, requires a fully-approved Amazon Associates
account with 10+ qualifying referred sales in the trailing 30 days — and neither reliably returned
star ratings or review counts, the two fields this ranking depends on. Hence the third-party
provider behind `AmazonProvider`; swapping providers means adding one file in
`supabase/functions/_shared/providers/`.

**Email delivery is the weak link, not the code.** Supabase's built-in mailer is rate-limited to a
handful of messages an hour and is documented as test-only. `supabase/config.toml` therefore ships
with `enable_confirmations = false`, which sidesteps it for sign-up — but **password reset still
sends an email**, so `/forgot-password` will be unreliable until you add your own SMTP provider
under Authentication → Emails. That is the one auth flow with no workaround.

**Deferred to a later phase** (per the agreed v1 scope): recommendation document generation, PDF
export, public share links with view tracking, e-signature and approvals, teams and roles, branding
settings, and the analytics dashboard. The schema and shared package are shaped so a document layer
can read `searches` + `search_results` without migration churn.

**Provider quota is the real cost constraint.** SerpApi's free tier is 250 searches a month, so the
function caches provider results in `query_cache` keyed on the normalized keyword set (sorted, so
"travel insulated mug" and "insulated mug travel" share an entry) and rate-limits each user to 20
searches an hour. Tune both before opening it up.
