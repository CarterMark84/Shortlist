import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Shortlist — the five best options, ranked',
    template: '%s · Shortlist',
  },
  description:
    'Describe what you need in plain language and get the five best-matching Amazon products, ranked on relevance, customer rating, review volume and price.',
  robots: {
    // A signed-in product surface; nothing here belongs in an index.
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0A09' },
  ],
};

/**
 * Applies a stored theme choice before first paint.
 *
 * Without this, a user who picked dark would see a white flash on every
 * navigation while React hydrated.
 */
const NO_FLASH_THEME_SCRIPT = `
try {
  var t = localStorage.getItem('shortlist-theme');
  if (t === 'light' || t === 'dark') {
    document.documentElement.setAttribute('data-theme', t);
  }
} catch (e) {}
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
