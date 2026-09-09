import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { isConfigured, supabaseAnonKey, supabaseUrl } from './lib/env';

/**
 * Session refresh + route guard.
 *
 * Named `proxy` because Next 16 renamed the `middleware` convention; the
 * runtime here is always Node.js.
 *
 * This exists because Server Components cannot write cookies. Supabase access
 * tokens are short-lived, so without a refresh here users would be silently
 * signed out whenever a token expired.
 */

/** Route prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = ['/search', '/history', '/saved'];

/**
 * Auth screens a signed-in user should be bounced away from.
 *
 * `/reset-password` is deliberately absent: a recovery link establishes a real
 * session before landing there, so redirecting authenticated users away would
 * make password resets impossible.
 */
const AUTH_ROUTES = ['/sign-in', '/sign-up', '/forgot-password'];

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Without configuration there is no session to refresh; let the app render
  // its setup instructions instead of throwing on every request.
  if (!isConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes the token and, via setAll above, writes the new cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (needsAuth && !user) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/sign-in';
    signIn.search = '';
    // Send them back where they were headed once they are in.
    signIn.searchParams.set('next', pathname);
    return NextResponse.redirect(signIn);
  }

  // Signed-in users have no reason to see the marketing page or the auth forms.
  if (user && (pathname === '/' || AUTH_ROUTES.includes(pathname))) {
    const search = request.nextUrl.clone();
    search.pathname = '/search';
    search.search = '';
    return NextResponse.redirect(search);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static assets. Keeping images and
     * fonts out avoids a pointless auth round-trip per asset.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
