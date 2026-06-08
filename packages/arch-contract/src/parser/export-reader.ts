import type { SourceFile } from 'ts-morph';

import type { ExportRecord } from '../core/types.js';
import { toPosix } from '../project/path-utils.js';
import { kindOfNode } from './ast-utils.js';

/**
 * Read named/default/re-export facts. `getExportedDeclarations()` transparently
 * follows barrel re-exports to the origin declaration, so re-exported symbols
 * map to their true declaring file — critical for usage attribution.
 */
export function readExports(sf: SourceFile): ExportRecord[] {
  const records: ExportRecord[] = [];
  const here = toPosix(sf.getFilePath());
  for (const [name, decls] of sf.getExportedDeclarations()) {
    const first = decls[0];
    if (!first) continue;
    const declFile = toPosix(first.getSourceFile().getFilePath());
    const isReExport = declFile !== here;
    records.push({
      name,
      kind: kindOfNode(first),
      isDefaultExport: name === 'default',
      isReExport,
      reExportedFrom: isReExport ? declFile : null,
    });
  }
  return records;
}

/** Map of exported name -> origin (declaring) file, barrel-resolved. */
export function readExportOrigins(sf: SourceFile): Map<string, string> {
  const origins = new Map<string, string>();
  for (const [name, decls] of sf.getExportedDeclarations()) {
    const first = decls[0];
    if (!first) continue;
    origins.set(name, toPosix(first.getSourceFile().getFilePath()));
  }
  return origins;
}
