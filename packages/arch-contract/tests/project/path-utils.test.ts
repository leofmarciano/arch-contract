import { describe, expect, it } from 'vitest';

import {
  isDeclarationFile,
  relativePosix,
  stripTsExt,
  toPosix,
} from '../../src/project/path-utils.js';

describe('path-utils', () => {
  it('toPosix converts backslashes', () => {
    expect(toPosix('C:\\a\\b.ts')).toBe('C:/a/b.ts');
    expect(toPosix('/a/b.ts')).toBe('/a/b.ts');
  });

  it('relativePosix yields a POSIX relative path', () => {
    expect(relativePosix('/root', '/root/src/a.ts')).toBe('src/a.ts');
  });

  it('isDeclarationFile detects .d.ts', () => {
    expect(isDeclarationFile('/x/y.d.ts')).toBe(true);
    expect(isDeclarationFile('/x/y.ts')).toBe(false);
  });

  it('stripTsExt removes ts/tsx/d.ts/js but keeps json', () => {
    expect(stripTsExt('a.ts')).toBe('a');
    expect(stripTsExt('a.tsx')).toBe('a');
    expect(stripTsExt('a.d.ts')).toBe('a');
    expect(stripTsExt('a.js')).toBe('a');
    expect(stripTsExt('a.json')).toBe('a.json');
  });
});
