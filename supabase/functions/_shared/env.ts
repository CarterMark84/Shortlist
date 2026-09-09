/**
 * Typed, validated access to the function's environment.
 *
 * Fails loudly at cold start for anything genuinely required, rather than
 * throwing a confusing `undefined` error deep inside a request.
 */

export type ProviderName = 'fixtures' | 'serpapi';

export interface FunctionConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  provider: ProviderName;
  anthropicApiKey: string | null;
  serpapiApiKey: string | null;
  amazonDomain: string;
  associateTag: string | null;
  rateLimitPerHour: number;
  /** How long provider results stay reusable, in seconds. */
  cacheTtlSeconds: number;
}

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string): string | null {
  const value = Deno.env.get(name);
  return value && value.length > 0 ? value : null;
}

function intOr(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(): FunctionConfig {
  const providerRaw = (Deno.env.get('AMAZON_PROVIDER') ?? 'fixtures').toLowerCase();
  const provider: ProviderName = providerRaw === 'serpapi' ? 'serpapi' : 'fixtures';

  return {
    // Injected automatically by the Supabase Edge runtime.
    supabaseUrl: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    provider,
    anthropicApiKey: optional('ANTHROPIC_API_KEY'),
    serpapiApiKey: optional('SERPAPI_API_KEY'),
    amazonDomain: Deno.env.get('AMAZON_DOMAIN') ?? 'amazon.com',
    associateTag: optional('AMAZON_ASSOCIATE_TAG'),
    rateLimitPerHour: intOr('SEARCH_RATE_LIMIT_PER_HOUR', 20),
    cacheTtlSeconds: intOr('QUERY_CACHE_TTL_SECONDS', 6 * 60 * 60),
  };
}
