/**
 * @fileoverview Assert that every TypeDoc entry-point path in astro.config.mjs
 * exists on disk after source checkouts. Fails non-zero when a path is missing
 * so starlight-typedoc missing-glob WARNs cannot silently drift past CI.
 * @module scripts/verify-typedoc-entrypoints
 */

import {existsSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, 'astro.config.mjs');
const sourcePathRe = /["'](\.(?:ergo-source|ergo-router-source)\/[^"']+)["']/g;

const config = readFileSync(configPath, 'utf8');
const paths = [...config.matchAll(sourcePathRe)].map((match) => match[1]);

if (paths.length === 0) {
  console.error(
    'verify-typedoc-entrypoints: no .ergo-source/ or .ergo-router-source/ paths found in astro.config.mjs',
  );
  process.exit(1);
}

const missing = paths.filter((relativePath) => !existsSync(join(root, relativePath)));

if (missing.length > 0) {
  console.error(
    'verify-typedoc-entrypoints: TypeDoc entry point(s) missing on disk.\n' +
      'Ensure .ergo-source and .ergo-router-source are checked out (same local constraint as TypeDoc).\n' +
      'Missing:\n' +
      missing.map((path) => `  - ${path}`).join('\n'),
  );
  process.exit(1);
}

console.log(
  `verify-typedoc-entrypoints: ok (${paths.length} entry point${paths.length === 1 ? '' : 's'})`,
);
