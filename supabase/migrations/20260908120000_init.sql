-- ============================================================================
-- Product recommendation platform — initial schema
--
-- Design notes:
--  * `user_id` is denormalized onto `search_results` so every RLS policy is a
--    plain `user_id = auth.uid()` comparison rather than a subquery join.
--  * The edge function writes with the service_role key (which bypasses RLS);
--    the user-facing policies below govern what the *clients* can see.
--  * `query_cache` has RLS enabled with no policies at all — that makes it
--    reachable only by the service role, which is exactly what we want for a
--    shared cache of paid API responses.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- profiles — mirrors auth.users so the app can join on user data safely
-- ────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Public user profile, created automatically on signup by handle_new_user().';


-- ────────────────────────────────────────────────────────────────────────────
-- searches — one row per search a user runs
-- ────────────────────────────────────────────────────────────────────────────
create table public.searches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  -- The user's original words, stored verbatim so history is honest.
  raw_query       text not null check (length(trim(raw_query)) > 0),
  -- Claude's structured reading: { keywords, category, mustHave, budget*, interpretation }
  expanded_query  jsonb,
  -- Which Amazon data source served this search ('fixtures' | 'serpapi' | ...)
  provider        text not null default 'fixtures',
  candidate_count integer not null default 0,
  scored_count    integer not null default 0,
  -- True when provider results were reused from query_cache (no paid call).
  cached          boolean not null default false,
  created_at      timestamptz not null default now()
);

create index searches_user_created_idx
  on public.searches (user_id, created_at desc);


-- ────────────────────────────────────────────────────────────────────────────
-- search_results — the ranked top N for a search
-- ────────────────────────────────────────────────────────────────────────────
create table public.search_results (
  id              uuid primary key default gen_random_uuid(),
  search_id       uuid not null references public.searches (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  rank            smallint not null check (rank between 1 and 20),
  asin            text not null,
  title           text not null,
  image_url       text,
  product_url     text not null,
  -- Minor units (cents). Nullable: providers do not always return a price.
  price_cents     integer check (price_cents is null or price_cents >= 0),
  currency        text not null default 'USD',
  rating          numeric(2, 1) check (rating is null or (rating >= 0 and rating <= 5)),
  review_count    integer not null default 0 check (review_count >= 0),
  score           double precision not null,
  -- Per-signal detail, so "why did this rank here" stays answerable later.
  score_breakdown jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (search_id, rank)
);

create index search_results_search_rank_idx
  on public.search_results (search_id, rank);

create index search_results_user_idx
  on public.search_results (user_id);


-- ────────────────────────────────────────────────────────────────────────────
-- saved_products — a user's shortlist
-- ────────────────────────────────────────────────────────────────────────────
create table public.saved_products (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  asin       text not null,
  -- Full ProductCandidate at save time. Prices and ratings drift; the user
  -- should still see what they actually saved.
  snapshot   jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, asin)
);

create index saved_products_user_created_idx
  on public.saved_products (user_id, created_at desc);


-- ────────────────────────────────────────────────────────────────────────────
-- query_cache — dedupes paid provider calls across all users
--
-- SerpApi's free tier is 250 searches/month, so two users asking for the same
-- thing must not cost two calls. Keyed on the normalized keyword string.
-- ────────────────────────────────────────────────────────────────────────────
create table public.query_cache (
  cache_key  text primary key,
  provider   text not null,
  -- Raw normalized ProductCandidate[] as returned by the provider.
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index query_cache_expires_idx
  on public.query_cache (expires_at);


-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.searches       enable row level security;
alter table public.search_results enable row level security;
alter table public.saved_products enable row level security;
alter table public.query_cache    enable row level security;

-- profiles ------------------------------------------------------------------
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- searches ------------------------------------------------------------------
create policy "Users can read own searches"
  on public.searches for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create own searches"
  on public.searches for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can delete own searches"
  on public.searches for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- search_results ------------------------------------------------------------
create policy "Users can read own search results"
  on public.search_results for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create own search results"
  on public.search_results for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can delete own search results"
  on public.search_results for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- saved_products ------------------------------------------------------------
create policy "Users can read own saved products"
  on public.saved_products for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can save products"
  on public.saved_products for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can unsave products"
  on public.saved_products for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- query_cache: intentionally NO policies. RLS is on, so authenticated and anon
-- roles are locked out entirely; only the service_role (which bypasses RLS)
-- can read or write it.


-- ============================================================================
-- Triggers
-- ============================================================================

-- Create a profile row whenever a new auth user appears (e.g. first Google
-- sign-in). Google puts the display name and picture in raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Keep profiles.updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ============================================================================
-- Helpers
-- ============================================================================

-- Housekeeping for the cache. Called opportunistically by the edge function;
-- can also be scheduled with pg_cron if the table ever grows.
create or replace function public.purge_expired_query_cache()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted integer;
begin
  delete from public.query_cache where expires_at < now();
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

revoke all on function public.purge_expired_query_cache() from public, anon, authenticated;
