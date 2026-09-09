#!/usr/bin/env node
/**
 * Copy the pure core of `@recs/shared` into the edge-function tree.
 *
 * Why this exists: the ranking algorithm must be identical in the browser, on
 * the phone, and inside the Deno edge function. npm workspace packages are not
 * resolvable from a Supabase function bundle, so rather than duplicate the
 * logic by hand (and let the copies drift), we keep ONE source of truth in
 * `packages/shared/src/` and mirror the dependency-free files here.
 *
 * The source files already use explicit `.ts` import extensions, so the copies
 * need no rewriting — Deno reads them verbatim.
 *
 *   node scripts/sync-shared.mjs           # write the copies
 *   node scripts/sync-shared.mjs --check   # fail if copies are stale (CI)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'packages', 'shared', 'src');
const OUT_DIR = join(ROOT, 'supabase', 'functions', '_shared', 'core');

/** Only dependency-free modules belong here — no theme, no api client. */
const FILES = ['types.ts', 'ranking.ts', 'format.ts'];

const checkOnly = process.argv.includes('--check');

function header(name) {
  return [
    '// ═══════════════════════════════════════════════════════════════════════',
    '// GENERATED FILE — DO NOT EDIT.',
    `// Mirrored from packages/shared/src/${name} by scripts/sync-shared.mjs.`,
    '// Edit the source there, then run `npm run sync:shared`.',
    '// ═══════════════════════════════════════════════════════════════════════',
    '',
    '',
  ].join('\n');
}

let stale = [];
let written = 0;

if (!checkOnly) mkdirSync(OUT_DIR, { recursive: true });

for (const name of FILES) {
  const srcPath = join(SRC_DIR, name);
  if (!existsSync(srcPath)) {
    console.error(`✗ missing source file: ${srcPath}`);
    process.exit(1);
  }

  const contents = header(name) + readFileSync(srcPath, 'utf8');
  const outPath = join(OUT_DIR, name);
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;

  if (current === contents) continue;

  if (checkOnly) {
    stale.push(name);
  } else {
    writeFileSync(outPath, contents, 'utf8');
    written += 1;
    console.log(`✓ synced ${name}`);
  }
}

if (checkOnly) {
  if (stale.length > 0) {
    console.error(
      `✗ edge-function core is stale: ${stale.join(', ')}\n` +
        '  Run `npm run sync:shared` and commit the result.',
    );
    process.exit(1);
  }
  console.log('✓ edge-function core is in sync with packages/shared');
} else if (written === 0) {
  console.log('✓ already in sync — nothing to do');
}
