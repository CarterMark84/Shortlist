import type { FunctionConfig } from '../env.ts';
import { createFixturesProvider } from './fixtures.ts';
import { createSerpApiProvider } from './serpapi.ts';
import { ProviderError, type AmazonProvider } from './types.ts';

export { ProviderError };
export type { AmazonProvider, ProviderSearchOptions } from './types.ts';

/**
 * Resolve the configured provider.
 *
 * Asking for `serpapi` without a key is a configuration mistake, not something
 * to paper over by silently serving fixture data — a developer would think they
 * were looking at live Amazon results.
 */
export function resolveProvider(config: FunctionConfig): AmazonProvider {
  if (config.provider === 'serpapi') {
    if (!config.serpapiApiKey) {
      throw new ProviderError(
        'serpapi',
        'AMAZON_PROVIDER=serpapi but SERPAPI_API_KEY is not set. ' +
          'Run: supabase secrets set SERPAPI_API_KEY=...',
      );
    }
    return createSerpApiProvider(config.serpapiApiKey);
  }

  return createFixturesProvider();
}
