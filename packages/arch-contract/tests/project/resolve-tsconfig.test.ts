import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveTsConfig } from '../../src/project/resolve-tsconfig.js';
import { toPosix } from '../../src/project/path-utils.js';
import { makeTmpDir, rmDir, writeFile } from '../helpers/tmp.js';

const dirs: string[] = [];
function tmp(): string {
  const d = makeTmpDir();
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) rmDir(dirs.pop() as string);
});

describe('resolveTsConfig', () => {
  it('reads baseUrl (resolved absolute) and paths', () => {
    const d = tmp();
    const p = writeFile(
      d,
      'tsconfig.json',
      JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@app/*': ['src/app/*'] } } }),
    );
    const resolved = resolveTsConfig(p);
    expect(resolved.baseUrl).toBe(toPosix(d));
    expect(resolved.paths['@app/*']).toEqual(['src/app/*']);
  });

  it('tolerates a tsconfig without paths', () => {
    const d = tmp();
    const p = writeFile(d, 'tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } }));
    const resolved = resolveTsConfig(p);
    expect(resolved.paths).toEqual({});
    expect(resolved.compilerOptions.strict).toBe(true);
  });

  it('supports JSON with comments (tsconfig style)', () => {
    const d = tmp();
    const file = path.join('nested', 'tsconfig.json');
    const p = writeFile(d, file, '{\n  // a comment\n  "compilerOptions": { "baseUrl": "." }\n}');
    expect(() => resolveTsConfig(p)).not.toThrow();
  });
});
