import { describe, expect, it } from 'vitest';

import { readExportOrigins, readExports } from '../../src/parser/export-reader.js';
import { inMemoryProject } from '../helpers/project.js';

function exportsOf(files: Record<string, string>, entry: string) {
  const project = inMemoryProject(files);
  return readExports(project.getSourceFileOrThrow(entry));
}

describe('readExports', () => {
  it('reads a named class export', () => {
    const recs = exportsOf({ '/proj/src/a.ts': `export class A {}` }, '/proj/src/a.ts');
    const a = recs.find((r) => r.name === 'A');
    expect(a).toMatchObject({ kind: 'class', isDefaultExport: false, isReExport: false });
  });

  it('reads a default export', () => {
    const recs = exportsOf({ '/proj/src/a.ts': `export default function f() {}` }, '/proj/src/a.ts');
    expect(recs.some((r) => r.isDefaultExport)).toBe(true);
  });

  it('marks re-exports and resolves their origin file', () => {
    const recs = exportsOf(
      { '/proj/src/index.ts': `export { A } from './a';`, '/proj/src/a.ts': `export class A {}` },
      '/proj/src/index.ts',
    );
    const a = recs.find((r) => r.name === 'A');
    expect(a?.isReExport).toBe(true);
    expect(a?.reExportedFrom).toBe('/proj/src/a.ts');
  });

  it('carries correct kinds for type alias / enum / interface', () => {
    const recs = exportsOf(
      { '/proj/src/a.ts': `export type T = 1;\nexport enum E { A }\nexport interface I {}` },
      '/proj/src/a.ts',
    );
    expect(recs.find((r) => r.name === 'T')?.kind).toBe('type');
    expect(recs.find((r) => r.name === 'E')?.kind).toBe('enum');
    expect(recs.find((r) => r.name === 'I')?.kind).toBe('interface');
  });
});

describe('readExportOrigins', () => {
  it('maps a barrel-exported name to its declaring file', () => {
    const project = inMemoryProject({
      '/proj/src/index.ts': `export { A } from './a';`,
      '/proj/src/a.ts': `export class A {}`,
    });
    const origins = readExportOrigins(project.getSourceFileOrThrow('/proj/src/index.ts'));
    expect(origins.get('A')).toBe('/proj/src/a.ts');
  });
});
