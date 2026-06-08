import type { FileFacts, UsageEntry } from '../core/types.js';

export interface UsageIndex {
  /** files that import (use) any exported symbol of `absFile`, barrel-resolved */
  getUsersOfFile(absFile: string): UsageEntry[];
}

/**
 * Build a reverse usage map from import edges. Named imports are attributed to
 * the symbol's ORIGIN file (following barrels via `exportOrigins`), so importing
 * `UserEntity` through `domain/entities/index.ts` still counts as a user of
 * `UserEntity.ts`. Default/namespace/side-effect imports attribute to the
 * literal target file.
 */
export function buildUsageIndex(
  files: FileFacts[],
  exportOrigins: Map<string, Map<string, string>>,
): UsageIndex {
  const usersByFile = new Map<string, UsageEntry[]>();

  const add = (origin: string, entry: UsageEntry): void => {
    const list = usersByFile.get(origin) ?? [];
    list.push(entry);
    usersByFile.set(origin, list);
  };

  for (const f of files) {
    for (const imp of f.imports) {
      const target = imp.targetFile;
      if (target === null) continue; // external/unresolved — not an intra-project user edge

      if (imp.importedSymbols.length === 0) {
        add(target, {
          userFile: f.file.path,
          importedSymbols: [],
          line: imp.line,
          column: imp.column,
        });
        continue;
      }

      // Group named symbols by their resolved origin file.
      const byOrigin = new Map<string, string[]>();
      const originsForTarget = exportOrigins.get(target);
      for (const sym of imp.importedSymbols) {
        const origin = originsForTarget?.get(sym) ?? target;
        const list = byOrigin.get(origin) ?? [];
        list.push(sym);
        byOrigin.set(origin, list);
      }
      for (const [origin, symbols] of byOrigin) {
        add(origin, {
          userFile: f.file.path,
          importedSymbols: symbols,
          line: imp.line,
          column: imp.column,
        });
      }
    }
  }

  return {
    getUsersOfFile: (absFile) => usersByFile.get(absFile) ?? [],
  };
}
