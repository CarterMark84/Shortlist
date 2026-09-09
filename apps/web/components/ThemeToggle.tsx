'use client';

import { useSyncExternalStore } from 'react';

type Choice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'shortlist-theme';

/**
 * The stored theme choice, exposed as an external store.
 *
 * `useSyncExternalStore` is the right primitive here rather than
 * useState + useEffect: localStorage genuinely *is* external state, the
 * `getServerSnapshot` hook gives a correct SSR value with no hydration
 * mismatch, and subscribing to `storage` events keeps multiple tabs in sync
 * for free.
 */
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Fires when another tab changes the preference.
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getSnapshot(): Choice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Private browsing or blocked storage.
  }
  return 'system';
}

/** The server cannot know the preference, so it always renders "system". */
function getServerSnapshot(): Choice {
  return 'system';
}

/**
 * Light / dark / system switch.
 *
 * Writes `data-theme` on <html>, which the generated token CSS reads. The
 * no-flash inline script in layout.tsx applies the stored choice before first
 * paint; this component handles changes.
 */
export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function apply(next: Choice) {
    const root = document.documentElement;
    if (next === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the choice just will not persist.
    }
    notify();
  }

  const options: { value: Choice; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <SunIcon /> },
    { value: 'system', label: 'System', icon: <MonitorIcon /> },
    { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
  ];

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5"
      role="radiogroup"
      aria-label="Colour theme"
    >
      {options.map((option) => {
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => apply(option.value)}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              active
                ? 'bg-accent-subtle text-accent'
                : 'text-ink-subtle hover:bg-surface-muted hover:text-ink-muted'
            }`}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
