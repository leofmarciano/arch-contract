import { describe, expect, it } from 'vitest';

import { readSourceFile } from '../../src/parser/source-file-reader.js';
import { inMemoryProject } from '../helpers/project.js';
import { runExpectation } from '../helpers/analysis.js';

const at = (p: string) => `/proj/${p}`;

describe('hasNamespaceExport (parser)', () => {
  function facts(source: string) {
    const project = inMemoryProject({ '/proj/src/a.ts': source, '/proj/src/x.ts': `export const y = 1;` });
    return readSourceFile(project.getSourceFileOrThrow('/proj/src/a.ts'), '/proj');
  }

  it('detects `export * from`', () => {
    expect(facts(`export * from './x';`).hasNamespaceExport).toBe(true);
  });

  it('detects `export * as ns from`', () => {
    expect(facts(`export * as ns from './x';`).hasNamespaceExport).toBe(true);
  });

  it('is false for named-only re-exports and plain exports', () => {
    expect(facts(`export { y } from './x';`).hasNamespaceExport).toBe(false);
    expect(facts(`export const z = 1;`).hasNamespaceExport).toBe(false);
  });
});

describe('notHave: [namespaceExport] clause', () => {
  it('flags a star export', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export * from './x';`, [at('src/x.ts')]: `export const y = 1;` },
      { name: 'no-barrel-star', expect: { path: 'src/a.ts' }, to: { notHave: ['namespaceExport'] } },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('namespaceExport');
  });

  it('passes when there is no star export', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export { y } from './x';`, [at('src/x.ts')]: `export const y = 1;` },
      { name: 'no-barrel-star', expect: { path: 'src/a.ts' }, to: { notHave: ['namespaceExport'] } },
    );
    expect(v).toEqual([]);
  });
});
