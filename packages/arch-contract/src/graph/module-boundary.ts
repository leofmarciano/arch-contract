/**
 * Module identity from a configurable glob pattern. The single `*` segment of
 * the pattern is the module name, e.g. pattern `src/modules/*` makes
 * `src/modules/billing/foo.ts` belong to module `billing`.
 */

function starIndex(patternSegs: string[]): number {
  return patternSegs.indexOf('*');
}

function prefixMatches(patternSegs: string[], fileSegs: string[], star: number): boolean {
  if (fileSegs.length <= star) return false;
  for (let i = 0; i < star; i++) {
    if (patternSegs[i] !== fileSegs[i]) return false;
  }
  return true;
}

export function moduleOf(relPath: string, pattern: string): string | null {
  const patternSegs = pattern.split('/');
  const fileSegs = relPath.split('/');
  const star = starIndex(patternSegs);
  if (star === -1 || !prefixMatches(patternSegs, fileSegs, star)) return null;
  return fileSegs[star] ?? null;
}

/** Relative POSIX path of the public-api/barrel file for the module containing `relPath`. */
export function publicApiPathOf(relPath: string, pattern: string, publicApi: string): string | null {
  const patternSegs = pattern.split('/');
  const fileSegs = relPath.split('/');
  const star = starIndex(patternSegs);
  if (star === -1 || !prefixMatches(patternSegs, fileSegs, star)) return null;
  return [...fileSegs.slice(0, star + 1), publicApi].join('/');
}

export function isPublicApiFile(relPath: string, pattern: string, publicApi: string): boolean {
  const api = publicApiPathOf(relPath, pattern, publicApi);
  return api !== null && api === relPath;
}
