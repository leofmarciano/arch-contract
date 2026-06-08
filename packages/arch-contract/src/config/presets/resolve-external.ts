import { createRequire } from 'node:module';
import path from 'node:path';

import { InvalidPresetError, PresetLoadError, type ConfigIssue } from '../errors.js';
import { presetFragmentSchema, type PresetFragmentInput } from '../schema.js';
import type { PresetMeta } from './types.js';

interface NodeError extends Error {
  code?: string;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

export interface ResolvedExternalPreset {
  meta?: PresetMeta;
  fragment: PresetFragmentInput;
}

/**
 * Load an EXTERNAL preset (an npm package name, scoped name, or local/relative
 * path) SYNCHRONOUSLY from the user's project, normalize CJS/ESM interop, and
 * validate its exported fragment.
 *
 * `baseDir` is the directory of the user's config file, so resolution walks the
 * user's `node_modules` upward (handles pnpm/npm/yarn hoisting) and resolves
 * relative paths against the project — never against arch-contract's own tree.
 *
 * The export contract: the module's default export (or `module.exports`) is
 * either a bare `PresetFragment`, or a `{ meta?, fragment }` entry.
 */
export function resolveExternalPreset(name: string, baseDir: string): ResolvedExternalPreset {
  // Anchor at a (possibly non-existent) file inside baseDir; createRequire only
  // uses its directory to seed module resolution.
  const require = createRequire(path.join(baseDir, '__arch-contract-preset-anchor__.cjs'));

  let resolved: string;
  try {
    resolved = require.resolve(name, { paths: [baseDir] });
  } catch (err) {
    throw new PresetLoadError(name, baseDir, { code: (err as NodeError).code, cause: err });
  }

  let mod: unknown;
  try {
    mod = require(resolved);
  } catch (err) {
    // Pure-ESM on Node <22.12 → ERR_REQUIRE_ESM; ESM with top-level await → ERR_REQUIRE_ASYNC_MODULE.
    throw new PresetLoadError(name, baseDir, { code: (err as NodeError).code, cause: err });
  }

  // CJS/ESM interop: prefer a `default` export, else the module namespace itself.
  const exported = isObject(mod) && 'default' in mod ? mod['default'] : mod;

  // Accept either a bare fragment or a { meta?, fragment } entry.
  const rawFragment = isObject(exported) && 'fragment' in exported ? exported['fragment'] : exported;
  const meta =
    isObject(exported) && 'meta' in exported ? (exported['meta'] as PresetMeta) : undefined;

  const parsed = presetFragmentSchema.safeParse(rawFragment);
  if (!parsed.success) {
    const issues: ConfigIssue[] = parsed.error.issues.map((i) => ({
      path: i.path.map((p) => String(p)).join('.'),
      message: i.message,
    }));
    throw new InvalidPresetError(name, issues);
  }

  return meta !== undefined ? { meta, fragment: parsed.data } : { fragment: parsed.data };
}
