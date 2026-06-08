import type { ExportDeclaration, ImportDeclaration, SourceFile } from 'ts-morph';

import type { ImportKind, ImportRecord } from '../core/types.js';
import { toPosix } from '../project/path-utils.js';
import { pos } from './ast-utils.js';

/** Parse the bare package name from a specifier (`lodash/fp` -> `lodash`, `@nestjs/common/x` -> `@nestjs/common`). */
export function parsePackageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.slice(0, 2).join('/');
  }
  return specifier.split('/')[0] ?? specifier;
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith('.');
}

function buildRecord(
  specifier: string,
  targetSf: SourceFile | undefined,
  importedSymbols: string[],
  kinds: ImportKind[],
  isTypeOnly: boolean,
  line: number,
  column: number,
): ImportRecord {
  // A bare specifier may resolve into node_modules; that is an external package,
  // not an intra-project target — keep `targetFile` to intra-project files only.
  const resolved = targetSf ? toPosix(targetSf.getFilePath()) : null;
  const inNodeModules = resolved !== null && resolved.includes('/node_modules/');
  const targetFile = inNodeModules ? null : resolved;
  const isExternalPackage = !isRelative(specifier) && (resolved === null || inNodeModules);
  return {
    specifier,
    targetFile,
    isExternalPackage,
    packageName: isExternalPackage ? parsePackageName(specifier) : null,
    importedSymbols,
    kinds: kinds.length > 0 ? kinds : ['side-effect'],
    isTypeOnly,
    line,
    column,
  };
}

function readImportDeclaration(decl: ImportDeclaration): ImportRecord {
  const specifier = decl.getModuleSpecifierValue();
  const targetSf = decl.getModuleSpecifierSourceFile();
  const named = decl.getNamedImports().map((n) => n.getName());
  const kinds: ImportKind[] = [];
  if (decl.getDefaultImport()) kinds.push('default');
  if (decl.getNamespaceImport()) kinds.push('namespace');
  if (named.length > 0) kinds.push('named');
  const p = pos(decl);
  return buildRecord(specifier, targetSf, named, kinds, decl.isTypeOnly(), p.line, p.column);
}

function readExportFrom(decl: ExportDeclaration): ImportRecord | null {
  const specifier = decl.getModuleSpecifierValue();
  if (!specifier) return null; // local export, not a re-export edge
  const targetSf = decl.getModuleSpecifierSourceFile();
  const named = decl.getNamedExports().map((n) => n.getName());
  const kinds: ImportKind[] = [];
  if (decl.isNamespaceExport() || decl.getNamespaceExport()) kinds.push('namespace');
  if (named.length > 0) kinds.push('named');
  const p = pos(decl);
  return buildRecord(specifier, targetSf, named, kinds, decl.isTypeOnly(), p.line, p.column);
}

/**
 * Extract every dependency edge from a source file: `import` declarations and
 * re-export (`export ... from`) declarations (which break/cross boundaries too).
 */
export function readImports(sf: SourceFile): ImportRecord[] {
  const records: ImportRecord[] = [];
  for (const decl of sf.getImportDeclarations()) {
    records.push(readImportDeclaration(decl));
  }
  for (const decl of sf.getExportDeclarations()) {
    const rec = readExportFrom(decl);
    if (rec) records.push(rec);
  }
  return records;
}
