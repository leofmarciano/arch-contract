import { describe, expect, it } from 'vitest';

import { parsePackageName, readImports } from '../../src/parser/import-reader.js';
import { inMemoryProject } from '../helpers/project.js';

function importsOf(files: Record<string, string>, entry: string) {
  const project = inMemoryProject(files);
  return readImports(project.getSourceFileOrThrow(entry));
}

describe('parsePackageName', () => {
  it('handles plain and scoped packages with subpaths', () => {
    expect(parsePackageName('lodash/fp')).toBe('lodash');
    expect(parsePackageName('@nestjs/common')).toBe('@nestjs/common');
    expect(parsePackageName('@nestjs/common/decorators')).toBe('@nestjs/common');
  });
});

describe('readImports', () => {
  it('resolves a relative import to the target file', () => {
    const recs = importsOf(
      { '/proj/src/a.ts': `import { B } from './b';`, '/proj/src/b.ts': `export const B = 1;` },
      '/proj/src/a.ts',
    );
    expect(recs[0]?.targetFile).toBe('/proj/src/b.ts');
    expect(recs[0]?.isExternalPackage).toBe(false);
    expect(recs[0]?.importedSymbols).toEqual(['B']);
    expect(recs[0]?.kinds).toContain('named');
  });

  it('flags an external package and parses its name', () => {
    const recs = importsOf({ '/proj/src/a.ts': `import fp from 'lodash/fp';` }, '/proj/src/a.ts');
    expect(recs[0]?.isExternalPackage).toBe(true);
    expect(recs[0]?.packageName).toBe('lodash');
    expect(recs[0]?.targetFile).toBeNull();
  });

  it('parses a scoped external package', () => {
    const recs = importsOf(
      { '/proj/src/a.ts': `import { Injectable } from '@nestjs/common';` },
      '/proj/src/a.ts',
    );
    expect(recs[0]?.packageName).toBe('@nestjs/common');
  });

  it('captures default and namespace import kinds', () => {
    const recs = importsOf(
      {
        '/proj/src/a.ts': `import Def from './b';\nimport * as ns from './c';`,
        '/proj/src/b.ts': `export default 1;`,
        '/proj/src/c.ts': `export const x = 1;`,
      },
      '/proj/src/a.ts',
    );
    expect(recs[0]?.kinds).toContain('default');
    expect(recs[1]?.kinds).toContain('namespace');
  });

  it('flags type-only imports', () => {
    const recs = importsOf(
      { '/proj/src/a.ts': `import type { T } from './b';`, '/proj/src/b.ts': `export type T = 1;` },
      '/proj/src/a.ts',
    );
    expect(recs[0]?.isTypeOnly).toBe(true);
  });

  it('captures re-export (`export ... from`) as a dependency edge', () => {
    const recs = importsOf(
      { '/proj/src/index.ts': `export * from './b';`, '/proj/src/b.ts': `export const B = 1;` },
      '/proj/src/index.ts',
    );
    expect(recs[0]?.targetFile).toBe('/proj/src/b.ts');
  });

  it('records line/column for each import', () => {
    const recs = importsOf(
      { '/proj/src/a.ts': `\nimport { B } from './b';`, '/proj/src/b.ts': `export const B = 1;` },
      '/proj/src/a.ts',
    );
    expect(recs[0]?.line).toBe(2);
    expect(recs[0]?.column).toBeGreaterThan(0);
  });
});

describe('readImports — tsconfig path aliases', () => {
  it('resolves an alias import to the project file (not external)', () => {
    const project = inMemoryProject(
      {
        '/proj/src/a.ts': `import { User } from '@app/user';`,
        '/proj/src/app/user.ts': `export class User {}`,
      },
      { baseUrl: '/proj', paths: { '@app/*': ['src/app/*'] } },
    );
    const recs = readImports(project.getSourceFileOrThrow('/proj/src/a.ts'));
    expect(recs[0]?.targetFile).toBe('/proj/src/app/user.ts');
    expect(recs[0]?.isExternalPackage).toBe(false);
  });
});
