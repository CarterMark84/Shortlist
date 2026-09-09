import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Sign out. POST-only so a stray link prefetch or crawler cannot end a
 * session.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const base = forwardedHost ? `${forwardedProto ?? 'https'}://${forwardedHost}` : origin;

  return NextResponse.redirect(`${base}/sign-in`, { status: 303 });
}
