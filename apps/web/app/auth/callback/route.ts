import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Email confirmation and password recovery landing point.
 *
 * Supabase redirects here with a `code`, which we exchange for a session.
 * Cookies can be written from a Route Handler, so this is where the session
 * actually gets established.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorDescription = searchParams.get('error_description');

  // Only ever redirect to our own paths — a caller-supplied absolute URL here
  // would be an open redirect.
  const requestedNext = searchParams.get('next') ?? '/search';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/search';

  // Respect a reverse proxy when building absolute redirects.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const base = forwardedHost
    ? `${forwardedProto ?? 'https'}://${forwardedHost}`
    : origin;

  if (errorDescription) {
    return NextResponse.redirect(
      `${base}/sign-in?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${base}/sign-in?error=${encodeURIComponent('No authorization code was returned.')}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${base}/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${base}${next}`);
}
