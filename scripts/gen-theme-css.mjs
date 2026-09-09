#!/usr/bin/env node
/**
 * Generate the web app's CSS design tokens from `packages/shared/src/theme.ts`.
 *
 * Tailwind v4 configures itself from CSS rather than a JS config file, so the
 * shared token module cannot be imported into a `tailwind.config.js` any more.
 * Rather than hand-maintain a second copy of the palette (which would drift),
 * this emits the CSS from the same source the mobile app consumes.
 *
 * Output pattern: semantic vars on `:root` (with dark overrides for both the
 * system preference and an explicit `data-theme`), mapped into Tailwind's
 * namespace with `@theme inline` so utilities like `bg-surface` and `text-ink`
 * follow the active theme.
 *
 *   node scripts/gen-theme-css.mjs
 *   node scripts/gen-theme-css.mjs --check
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(ROOT, 'apps', 'web', 'app', 'theme.generated.css');

// Node strips TypeScript types natively, so the shared module imports directly.
const { palette, radius, spacing, fontSize, layout } = await import(
  new URL('../packages/shared/src/theme.ts', import.meta.url).href
);

/**
 * Palette key → CSS token name. Explicit rather than derived so the utility
 * names read well: `text-ink`, `bg-canvas`, `border-line`.
 */
const NAME_MAP = {
  bg: 'canvas',
  surface: 'surface',
  surfaceMuted: 'surface-muted',
  border: 'line',
  borderStrong: 'line-strong',
  text: 'ink',
  textMuted: 'ink-muted',
  textSubtle: 'ink-subtle',
  accent: 'accent',
  accentHover: 'accent-hover',
  accentPressed: 'accent-pressed',
  accentSubtle: 'accent-subtle',
  accentBorder: 'accent-border',
  onAccent: 'on-accent',
  star: 'star',
  starEmpty: 'star-empty',
  success: 'success',
  successSubtle: 'success-subtle',
  danger: 'danger',
  dangerSubtle: 'danger-subtle',
  scrim: 'scrim',
};

function varsFor(scheme, indent = '  ') {
  return Object.entries(NAME_MAP)
    .map(([key, name]) => `${indent}--${name}: ${palette[scheme][key]};`)
    .join('\n');
}

const lines = [];
const push = (line = '') => lines.push(line);

push('/* ═══════════════════════════════════════════════════════════════════════');
push(' * GENERATED FILE — DO NOT EDIT.');
push(' * Produced from packages/shared/src/theme.ts by scripts/gen-theme-css.mjs.');
push(' * Edit the tokens there, then run `npm run gen:theme`.');
push(' * ═══════════════════════════════════════════════════════════════════════ */');
push();

push('/* Semantic tokens — light is the base. */');
push(':root {');
push('  color-scheme: light;');
push(varsFor('light'));
push('}');
push();

push('/* Follow the OS preference unless the user has explicitly chosen light. */');
push('@media (prefers-color-scheme: dark) {');
push('  :root:not([data-theme="light"]) {');
push('    color-scheme: dark;');
push(varsFor('dark', '    '));
push('  }');
push('}');
push();

push('/* An explicit choice wins in both directions. */');
push(':root[data-theme="dark"] {');
push('  color-scheme: dark;');
push(varsFor('dark'));
push('}');
push();
push(':root[data-theme="light"] {');
push('  color-scheme: light;');
push(varsFor('light'));
push('}');
push();

push('/* Expose the semantic tokens to Tailwind utilities. */');
push('@theme inline {');
for (const name of Object.values(NAME_MAP)) {
  push(`  --color-${name}: var(--${name});`);
}
push();
for (const [key, value] of Object.entries(radius)) {
  push(`  --radius-${key}: ${typeof value === 'number' ? `${value}px` : value};`);
}
push();
for (const [key, value] of Object.entries(fontSize)) {
  push(`  --text-${key}: ${value / 16}rem;`);
}
push();
push(`  --spacing-gutter: ${spacing[6]}px;`);
push(`  --container-content: ${layout.contentMaxWidth}px;`);
push(`  --container-search: ${layout.searchMaxWidth}px;`);
push('}');
push();

const output = lines.join('\n');

if (process.argv.includes('--check')) {
  const current = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, 'utf8') : null;
  if (current !== output) {
    console.error('✗ apps/web/app/theme.generated.css is stale. Run `npm run gen:theme`.');
    process.exit(1);
  }
  console.log('✓ theme CSS is in sync with packages/shared/src/theme.ts');
} else {
  writeFileSync(OUT_PATH, output, 'utf8');
  console.log(`✓ wrote ${OUT_PATH.replace(ROOT, '.')}`);
}
