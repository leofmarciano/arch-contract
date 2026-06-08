import picomatch from 'picomatch';

import type { ImportRecord } from '../../core/types.js';

/**
 * Match an external import against forbidden package patterns. Patterns like
 * `express`, `@nestjs/*`, `@prisma/client` match the bare package name; the full
 * specifier is also tested so subpath patterns (`lodash/fp`) work. Intra-project
 * imports (no packageName) never match.
 */
export function matchesForbiddenPackage(imp: ImportRecord, patterns: string[]): boolean {
  if (imp.packageName === null || patterns.length === 0) return false;
  const isMatch = picomatch(patterns, { dot: true });
  return isMatch(imp.packageName) || isMatch(imp.specifier);
}
