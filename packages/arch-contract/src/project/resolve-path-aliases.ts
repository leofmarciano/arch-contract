import path from 'node:path';

import { toPosix } from './path-utils.js';

export function isRelativeSpecifier(s: string): boolean {
  return s === '.' || s === '..' || s.startsWith('./') || s.startsWith('../');
}

export interface AliasMatcher {
  /** absolute POSIX candidate paths (without extension) for a specifier, longest-prefix first */
  resolve(specifier: string): string[];
  /** alias key prefixes (e.g. `@app/`) for external classification */
  prefixes(): string[];
}

interface AliasEntry {
  prefix: string;
  hasStar: boolean;
  key: string;
  targets: string[];
}

export function buildAliasMatcher(
  paths: Record<string, string[]>,
  absBaseUrl: string,
): AliasMatcher {
  const entries: AliasEntry[] = Object.entries(paths)
    .map(([key, targets]) => {
      const starIdx = key.indexOf('*');
      return {
        key,
        hasStar: starIdx !== -1,
        prefix: starIdx === -1 ? key : key.slice(0, starIdx),
        targets,
      };
    })
    .sort((a, b) => b.prefix.length - a.prefix.length);

  return {
    resolve(specifier: string): string[] {
      for (const e of entries) {
        if (e.hasStar) {
          if (specifier.startsWith(e.prefix)) {
            const rest = specifier.slice(e.prefix.length);
            return e.targets.map((t) => toPosix(path.join(absBaseUrl, t.replace('*', rest))));
          }
        } else if (specifier === e.key) {
          return e.targets.map((t) => toPosix(path.join(absBaseUrl, t)));
        }
      }
      return [];
    },
    prefixes(): string[] {
      return entries.map((e) => e.prefix);
    },
  };
}

export function isExternalSpecifier(specifier: string, aliasPrefixes: string[] = []): boolean {
  if (isRelativeSpecifier(specifier)) return false;
  if (aliasPrefixes.some((p) => (p === '' ? false : specifier.startsWith(p)))) return false;
  return true;
}
