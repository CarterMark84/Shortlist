#!/usr/bin/env node
/**
 * Fail the build if a `'use server'` file exports anything but an async
 * function.
 *
 * Why this exists: Next rejects such a module at *load* time with
 *
 *   A "use server" file can only export async functions, found object
 *
 * which turns every action in the file into an HTTP 500. `next build`
 * compiles it without complaint and typecheck passes, so the only way it
 * surfaces is a user submitting the form. This shipped once already — an
 * `export const initialAuthState = {...}` sitting next to the actions took out
 * both the sign-up and search forms.
 *
 *   node scripts/check-server-actions.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEARCH_ROOTS = [join(ROOT, 'apps', 'web'), join(ROOT, 'apps', 'mobile')];
const SKIP_DIRS = new Set(['node_modules', '.next', '.expo', '.turbo', 'dist', '.git']);

/** Every .ts/.tsx file under a root, skipping build output. */
function* sourceFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* sourceFiles(full);
    } else if (/\.tsx?$/.test(entry.name)) {
      yield full;
    }
  }
}

/** A file is a server-action module only if the directive is the first code. */
function hasUseServerDirective(source) {
  const firstCode = source
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*'));
  return firstCode === `'use server';` || firstCode === '"use server";';
}

const violations = [];
let checked = 0;

for (const root of SEARCH_ROOTS) {
  if (!statSync(root, { throwIfNoEntry: false })) continue;

  for (const file of sourceFiles(root)) {
    const source = readFileSync(file, 'utf8');
    if (!hasUseServerDirective(source)) continue;
    checked += 1;

    source.split('\n').forEach((line, index) => {
      const trimmed = line.trim();

      // `export type` / `export interface` are erased at compile time, so they
      // never reach the runtime export check Next performs.
      if (/^export\s+(type|interface)\b/.test(trimmed)) return;

      const bad =
        // export const x = ...  /  export let  /  export var  /  export class
        /^export\s+(const|let|var|class)\s/.test(trimmed) ||
        // export default <not an async function>
        (/^export\s+default\s/.test(trimmed) && !/^export\s+default\s+async\s+function\b/.test(trimmed)) ||
        // export { a, b } — re-exports are not async function declarations
        /^export\s*\{/.test(trimmed) ||
        // export function foo (missing async)
        /^export\s+function\s/.test(trimmed);

      if (bad) {
        violations.push({
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: index + 1,
          code: trimmed.slice(0, 90),
        });
      }
    });
  }
}

if (violations.length > 0) {
  console.error(
    `\n✗ A "use server" file may only export async functions.\n` +
      `  Next fails these modules at load time, so every action in them returns HTTP 500.\n` +
      `  Move constants and types into a sibling module without the directive.\n`,
  );
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}`);
    console.error(`    ${violation.code}`);
  }
  console.error('');
  process.exit(1);
}

console.log(`✓ ${checked} "use server" file(s) export only async functions`);
