/**
 * Typed client for the `recommend` edge function.
 *
 * Both the web and mobile apps call through here, so the request shape, error
 * taxonomy and user-facing error copy exist in exactly one place.
 */

import type { ApiErrorBody, RecommendResponse } from './types.ts';

export class ApiError extends Error {
  readonly code: ApiErrorBody['code'];
  readonly status: number;
  readonly retryAfter?: number;

  constructor(message: string, code: ApiErrorBody['code'], status: number, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export interface RecommendOptions {
  /** e.g. `https://abcdefg.supabase.co` */
  supabaseUrl: string;
  /** Publishable anon key. */
  anonKey: string;
  /** The signed-in user's JWT — the function refuses anonymous callers. */
  accessToken: string;
  signal?: AbortSignal;
  /** Injectable for tests. */
  fetchImpl?: typeof globalThis.fetch;
}

/**
 * Ask for recommendations. Resolves with the ranked top 5, or throws `ApiError`
 * carrying a code the UI can branch on.
 */
export async function requestRecommendations(
  query: string,
  options: RecommendOptions,
): Promise<RecommendResponse> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new ApiError('Describe what you are looking for first.', 'invalid_request', 400);
  }

  const doFetch = options.fetchImpl ?? globalThis.fetch;
  const endpoint = `${options.supabaseUrl.replace(/\/+$/, '')}/functions/v1/recommend`;

  let response: Response;
  try {
    response = await doFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: options.anonKey,
        Authorization: `Bearer ${options.accessToken}`,
      },
      body: JSON.stringify({ query: trimmed }),
      signal: options.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(
      'Could not reach the recommendation service. Check your connection and try again.',
      'internal_error',
      0,
    );
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = (payload ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(
      body.error ?? 'Something went wrong finding recommendations.',
      body.code ?? 'internal_error',
      response.status,
      body.retryAfter,
    );
  }

  return payload as RecommendResponse;
}

/** Copy shown to the user for each failure mode. */
export function describeApiError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Something went wrong finding recommendations. Please try again.';
  }

  switch (error.code) {
    case 'unauthorized':
      return 'Your session expired. Please sign in again.';
    case 'invalid_request':
      return error.message;
    case 'rate_limited':
      return error.retryAfter
        ? `You have hit the search limit. Try again in about ${Math.ceil(error.retryAfter / 60)} minute(s).`
        : 'You have hit the search limit for now. Try again shortly.';
    case 'interpretation_error':
      return error.message;
    case 'provider_error':
      return 'Amazon product data is temporarily unavailable. Please try again in a moment.';
    default:
      return 'Something went wrong finding recommendations. Please try again.';
  }
}
