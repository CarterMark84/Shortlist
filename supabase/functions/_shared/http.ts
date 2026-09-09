/** CORS headers and JSON response helpers shared by every function. */

import type { ApiErrorBody } from './core/types.ts';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export function jsonResponse(body: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export function errorResponse(
  code: ApiErrorBody['code'],
  message: string,
  status: number,
  retryAfter?: number,
): Response {
  const body: ApiErrorBody = { error: message, code };
  if (retryAfter !== undefined) body.retryAfter = retryAfter;

  return jsonResponse(
    body,
    status,
    retryAfter !== undefined ? { 'Retry-After': String(retryAfter) } : {},
  );
}

/** Handle the CORS preflight. Returns null when the request is not a preflight. */
export function handlePreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;
  return new Response('ok', { headers: corsHeaders });
}
