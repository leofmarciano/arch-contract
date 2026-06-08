import { describe, expect, it } from 'vitest';

import { readSourceFile } from '../../src/parser/source-file-reader.js';
import { buildSymbolIndex } from '../../src/parser/symbol-resolver.js';
import { inMemoryProject } from '../helpers/project.js';

function indexOf(files: Record<string, string>) {
  const project = inMemoryProject(files);
  const facts = project.getSourceFiles().map((sf) => readSourceFile(sf, '/proj'));
  return buildSymbolIndex(facts);
}

describe('buildSymbolIndex', () => {
  it('maps an exported class to its declaring file with structural facts', () => {
    const idx = indexOf({
      '/proj/src/a.ts': `export class A extends Base { findById() {} }`,
    });
    const a = idx.get('A');
    expect(a?.file).toBe('/proj/src/a.ts');
    expect(a?.kind).toBe('class');
    expect(a?.extendsName).toBe('Base');
    expect(a?.methods).toEqual(['findById']);
  });

  it('does not index non-exported declarations', () => {
    const idx = indexOf({ '/proj/src/a.ts': `class Hidden {}` });
    expect(idx.get('Hidden')).toBeUndefined();
  });

  it('byFile returns the declarations of a file', () => {
    const idx = indexOf({ '/proj/src/a.ts': `export class A {}\nexport interface I {}` });
    expect(idx.byFile('/proj/src/a.ts').map((e) => e.name).sort()).toEqual(['A', 'I']);
  });

  it('keeps colliding names from different files retrievable', () => {
    const idx = indexOf({
      '/proj/src/a.ts': `export class Repo {}`,
      '/proj/src/b.ts': `export class Repo {}`,
    });
    expect(idx.getAll('Repo')).toHaveLength(2);
  });
});
