/**
 * @fileoverview Assert that every TypeDoc entry-point path in astro.config.mjs
 * exists on disk after source checkouts. Fails non-zero when a path is missing
 * so starlight-typedoc missing-glob WARNs cannot silently drift past CI.
 * @module scripts/verify-typedoc-entrypoints
 */

import {readFileSync, statSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, 'astro.config.mjs');
const sourcePathRe = /["'](\.(?:ergo-source|ergo-router-source)\/[^"']+)["']/g;

/**
 * Strip block and line comments so commented-out historical paths are not enforced.
 * Adequate for `astro.config.mjs`, which does not embed comment delimiters inside
 * the quoted entry-point strings we match.
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Collect `.ergo-source/` / `.ergo-router-source/` paths from `entryPoints` arrays only.
 * @param {string} configSource
 * @returns {string[]}
 */
function collectEntryPointPaths(configSource) {
  const withoutComments = stripComments(configSource);
  const blocks = [...withoutComments.matchAll(/entryPoints\s*:\s*\[([^\]]*)\]/g)];
  const paths = [];
  for (const block of blocks) {
    for (const match of block[1].matchAll(sourcePathRe)) {
      paths.push(match[1]);
    }
  }
  return paths;
}

/**
 * Reject path traversal segments that would escape the expected checkout roots.
 * @param {string} relativePath
 * @returns {boolean}
 */
function isSafeRelativePath(relativePath) {
  if (relativePath.includes('\0')) {
    return false;
  }
  return !relativePath.split(/[/\\]/).includes('..');
}

/**
 * @param {string} absolutePath
 * @returns {boolean}
 */
function isExistingFile(absolutePath) {
  try {
    return statSync(absolutePath).isFile();
  } catch {
    return false;
  }
}

const config = readFileSync(configPath, 'utf8');
const paths = collectEntryPointPaths(config);

if (paths.length === 0) {
  console.error(
    'verify-typedoc-entrypoints: no .ergo-source/ or .ergo-router-source/ paths found in entryPoints arrays in astro.config.mjs',
  );
  process.exit(1);
}

/** @type {string[]} */
const unsafe = [];
/** @type {string[]} */
const missing = [];

for (const relativePath of paths) {
  if (!isSafeRelativePath(relativePath)) {
    unsafe.push(relativePath);
    continue;
  }
  if (!isExistingFile(join(root, relativePath))) {
    missing.push(relativePath);
  }
}

if (unsafe.length > 0) {
  console.error(
    'verify-typedoc-entrypoints: entry path(s) contain unsafe segments (`..` or NUL).\n' +
      unsafe.map((path) => `  - ${path}`).join('\n'),
  );
  process.exit(1);
}

if (missing.length > 0) {
  console.error(
    'verify-typedoc-entrypoints: TypeDoc entry point(s) missing on disk (must be files).\n' +
      'Ensure .ergo-source and .ergo-router-source are checked out (same local constraint as TypeDoc).\n' +
      'Missing:\n' +
      missing.map((path) => `  - ${path}`).join('\n'),
  );
  process.exit(1);
}

console.log(
  `verify-typedoc-entrypoints: ok (${paths.length} entry point${paths.length === 1 ? '' : 's'})`,
);
