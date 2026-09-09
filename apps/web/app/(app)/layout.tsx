import { redirect } from 'next/navigation';

import { Header } from '@/components/Header';
import { getCurrentUser } from '@/lib/supabase/server';

/**
 * Every route in this group renders per-user data behind auth, so none of it
 * may be prerendered at build time or cached across users. Declared on the
 * layout so it applies to all child segments.
 */
export const dynamic = 'force-dynamic';

/**
 * Shell for every signed-in route.
 *
 * proxy.ts already guards these paths; this second check is deliberate
 * defence in depth — a proxy matcher change should not silently expose a page.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const metadata = user.user_metadata as
    | { full_name?: string; name?: string; avatar_url?: string; picture?: string }
    | undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        email={user.email ?? null}
        displayName={metadata?.full_name ?? metadata?.name ?? null}
        avatarUrl={metadata?.avatar_url ?? metadata?.picture ?? null}
      />
      <main className="mx-auto w-full max-w-(--container-content) flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
