import { describe, expect, it } from 'vitest';

import { isPublicApiFile, moduleOf, publicApiPathOf } from '../../src/graph/module-boundary.js';

describe('module-boundary', () => {
  it('extracts the module name from the star segment', () => {
    expect(moduleOf('src/modules/billing/foo.ts', 'src/modules/*')).toBe('billing');
    expect(moduleOf('src/modules/users/domain/User.ts', 'src/modules/*')).toBe('users');
  });

  it('returns null for files outside the module pattern', () => {
    expect(moduleOf('src/shared/util.ts', 'src/modules/*')).toBeNull();
    expect(moduleOf('src/modules', 'src/modules/*')).toBeNull();
  });

  it('two files in the same module share the module name', () => {
    expect(moduleOf('src/modules/billing/a.ts', 'src/modules/*')).toBe(
      moduleOf('src/modules/billing/b/c.ts', 'src/modules/*'),
    );
  });

  it('computes the public-api path for a module', () => {
    expect(publicApiPathOf('src/modules/billing/internal/x.ts', 'src/modules/*', 'index.ts')).toBe(
      'src/modules/billing/index.ts',
    );
  });

  it('isPublicApiFile is true only for the barrel', () => {
    expect(isPublicApiFile('src/modules/billing/index.ts', 'src/modules/*', 'index.ts')).toBe(true);
    expect(isPublicApiFile('src/modules/billing/internal/x.ts', 'src/modules/*', 'index.ts')).toBe(
      false,
    );
  });
});
