import picomatch from 'picomatch';

import type { ImportRecord } from '../../core/types.js';

/**
 * Match an import against forbidden package patterns. Patterns like `express`,
 * `@nestjs/*`, `@prisma/client` match the bare package name; the full specifier is
 * also tested so subpath patterns (`lodash/fp`, `encore.dev/*`) and path aliases
 * (`~encore/*`) work even when the specifier resolved to a file (node_modules or a
 * generated in-project file) and `packageName` is therefore null. Only relative
 * imports — intra-project file edges handled by path/layer rules — never match.
 */
export function matchesForbiddenPackage(imp: ImportRecord, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  if (imp.specifier.startsWith('.')) return false;
  const isMatch = picomatch(patterns, { dot: true });
  return (imp.packageName !== null && isMatch(imp.packageName)) || isMatch(imp.specifier);
}
