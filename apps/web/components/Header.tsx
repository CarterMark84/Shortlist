import Image from 'next/image';

import { Logo } from './Logo';
import { NavLinks } from './NavLinks';
import { ThemeToggle } from './ThemeToggle';

export function Header({
  email,
  displayName,
  avatarUrl,
}: {
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const name = displayName ?? email ?? 'Account';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-(--container-content) items-center gap-4 px-4 sm:px-6">
        <Logo />

        <div className="ml-2 hidden sm:block">
          <NavLinks />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-line object-cover"
              />
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent"
                aria-hidden="true"
              >
                {initial}
              </span>
            )}
            <span className="hidden max-w-32 truncate text-sm text-ink-muted lg:block" title={name}>
              {name}
            </span>
          </div>

          {/* POST, so no prefetch or crawler can end the session. */}
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Nav moves below the wordmark on narrow screens. */}
      <div className="border-t border-line px-4 py-2 sm:hidden">
        <div className="flex items-center justify-between">
          <NavLinks />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
