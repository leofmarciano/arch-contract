import { describe, expect, it } from 'vitest';

import { readExportOrigins } from '../../src/parser/export-reader.js';
import { readSourceFile } from '../../src/parser/source-file-reader.js';
import { buildUsageIndex } from '../../src/parser/usage-index.js';
import { inMemoryProject } from '../helpers/project.js';

function usage(files: Record<string, string>) {
  const project = inMemoryProject(files);
  const sfs = project.getSourceFiles();
  const facts = sfs.map((sf) => readSourceFile(sf, '/proj'));
  const origins = new Map(sfs.map((sf) => [sf.getFilePath() as string, readExportOrigins(sf)]));
  return buildUsageIndex(facts, origins);
}

describe('buildUsageIndex', () => {
  it('attributes a direct import to the target file', () => {
    const idx = usage({
      '/proj/src/a.ts': `export class A {}`,
      '/proj/src/b.ts': `import { A } from './a';\nexport const b = A;`,
    });
    expect(idx.getUsersOfFile('/proj/src/a.ts').map((u) => u.userFile)).toEqual(['/proj/src/b.ts']);
  });

  it('attributes a barrel import to the ORIGIN file, not the barrel', () => {
    const idx = usage({
      '/proj/src/a.ts': `export class A {}`,
      '/proj/src/index.ts': `export { A } from './a';`,
      '/proj/src/c.ts': `import { A } from './index';\nexport const c = A;`,
    });
    const users = idx.getUsersOfFile('/proj/src/a.ts').map((u) => u.userFile);
    expect(users).toContain('/proj/src/c.ts');
  });

  it('reports the import location for a user', () => {
    const idx = usage({
      '/proj/src/a.ts': `export class A {}`,
      '/proj/src/b.ts': `import { A } from './a';\nexport const b = A;`,
    });
    const entry = idx.getUsersOfFile('/proj/src/a.ts')[0];
    expect(entry?.line).toBe(1);
    expect(entry?.importedSymbols).toEqual(['A']);
  });

  it('returns an empty list for a file with no users', () => {
    const idx = usage({ '/proj/src/a.ts': `export class A {}` });
    expect(idx.getUsersOfFile('/proj/src/a.ts')).toEqual([]);
  });
});
