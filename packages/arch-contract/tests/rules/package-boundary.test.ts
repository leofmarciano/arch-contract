import { describe, expect, it } from 'vitest';

import type { ImportRecord } from '../../src/core/types.js';
import { matchesForbiddenPackage } from '../../src/rules/built-in/package-boundary.js';

function importRecord(overrides: Partial<ImportRecord> = {}): ImportRecord {
  return {
    specifier: 'encore.dev/api',
    targetFile: null,
    isExternalPackage: true,
    packageName: 'encore.dev',
    importedSymbols: ['APIError'],
    kinds: ['named'],
    isTypeOnly: false,
    line: 1,
    column: 1,
    ...overrides,
  };
}

describe('matchesForbiddenPackage', () => {
  it('matches a subpath import that resolved into node_modules (packageName lost)', () => {
    // Reproduces the bug condition exactly: ts-morph resolved the package into
    // node_modules, so targetFile is set and packageName is null.
    const imp = importRecord({
      packageName: null,
      isExternalPackage: false,
      targetFile: '/proj/node_modules/encore.dev/api.d.ts',
    });
    expect(matchesForbiddenPackage(imp, ['encore.dev/*'])).toBe(true);
  });

  it('matches a non-relative specifier via its bare packageName', () => {
    const imp = importRecord({ specifier: 'lodash/fp', packageName: 'lodash' });
    expect(matchesForbiddenPackage(imp, ['lodash'])).toBe(true);
  });

  it('matches a type-only import (isTypeOnly is ignored)', () => {
    const imp = importRecord({ packageName: null, isExternalPackage: false, isTypeOnly: true });
    expect(matchesForbiddenPackage(imp, ['encore.dev/*'])).toBe(true);
  });

  it('matches a path-alias specifier with no packageName', () => {
    const imp = importRecord({
      specifier: '~encore/auth',
      packageName: null,
      isExternalPackage: false,
      targetFile: '/proj/encore.gen/auth.ts',
    });
    expect(matchesForbiddenPackage(imp, ['~encore/*'])).toBe(true);
  });

  it('never matches a relative import', () => {
    const imp = importRecord({
      specifier: '../infra/db',
      packageName: null,
      isExternalPackage: false,
      targetFile: '/proj/src/infra/db.ts',
    });
    expect(matchesForbiddenPackage(imp, ['*'])).toBe(false);
  });

  it('returns false when there are no patterns', () => {
    expect(matchesForbiddenPackage(importRecord(), [])).toBe(false);
  });
});
