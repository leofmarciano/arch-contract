import fs from 'node:fs';
import path from 'node:path';

import picomatch from 'picomatch';

import { isDeclarationFile, relativePosix, toPosix } from './path-utils.js';

const TS_EXT = /\.(m|c)?tsx?$/i;

/** A bare directory pattern (no glob chars) also matches everything beneath it. */
function expandInclude(pattern: string): string[] {
  return /[*?{}[\]()!+@]/.test(pattern) ? [pattern] : [pattern, `${pattern}/**`];
}

export function makeMatcher(patterns: string[]): (relPath: string) => boolean {
  if (patterns.length === 0) return () => false;
  const expanded = patterns.flatMap(expandInclude);
  const isMatch = picomatch(expanded, { dot: true });
  return (relPath) => isMatch(relPath);
}

/** True when `relPath` is inside the include set and outside the exclude set (and not a .d.ts). */
export function matchesGlobs(relPath: string, include: string[], exclude: string[]): boolean {
  if (isDeclarationFile(relPath)) return false;
  const included = include.length === 0 ? true : makeMatcher(include)(relPath);
  if (!included) return false;
  return !makeMatcher(exclude)(relPath);
}

/** Recursively list TypeScript files under `rootDir` matching include/exclude. */
export function discoverFilesOnDisk(
  rootDir: string,
  include: string[],
  exclude: string[],
): string[] {
  const out: string[] = [];
  const includeMatch = makeMatcher(include);
  const excludeMatch = makeMatcher(exclude);

  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = relativePosix(rootDir, abs);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        if (excludeMatch(rel) || excludeMatch(`${rel}/`)) continue;
        walk(abs);
      } else if (entry.isFile()) {
        if (!TS_EXT.test(entry.name) || isDeclarationFile(entry.name)) continue;
        if (include.length > 0 && !includeMatch(rel)) continue;
        if (excludeMatch(rel)) continue;
        out.push(toPosix(abs));
      }
    }
  };

  walk(rootDir);
  return out.sort();
}
