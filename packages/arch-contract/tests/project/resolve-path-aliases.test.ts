import { describe, expect, it } from 'vitest';

import {
  buildAliasMatcher,
  isExternalSpecifier,
  isRelativeSpecifier,
} from '../../src/project/resolve-path-aliases.js';

describe('resolve-path-aliases', () => {
  it('resolves a wildcard alias against baseUrl', () => {
    const m = buildAliasMatcher({ '@app/*': ['src/app/*'] }, '/proj');
    expect(m.resolve('@app/user')).toEqual(['/proj/src/app/user']);
  });

  it('prefers the longest matching prefix', () => {
    const m = buildAliasMatcher(
      { '@app/*': ['src/app/*'], '@app/core/*': ['src/core/*'] },
      '/proj',
    );
    expect(m.resolve('@app/core/thing')).toEqual(['/proj/src/core/thing']);
  });

  it('resolves an exact (non-wildcard) alias', () => {
    const m = buildAliasMatcher({ '@config': ['src/config/index.ts'] }, '/proj');
    expect(m.resolve('@config')).toEqual(['/proj/src/config/index.ts']);
  });

  it('classifies relative specifiers', () => {
    expect(isRelativeSpecifier('./x')).toBe(true);
    expect(isRelativeSpecifier('../x')).toBe(true);
    expect(isRelativeSpecifier('@app/x')).toBe(false);
    expect(isRelativeSpecifier('lodash')).toBe(false);
  });

  it('classifies external specifiers (alias prefixes are not external)', () => {
    expect(isExternalSpecifier('lodash')).toBe(true);
    expect(isExternalSpecifier('@scope/pkg')).toBe(true);
    expect(isExternalSpecifier('./x')).toBe(false);
    expect(isExternalSpecifier('@app/x', ['@app/'])).toBe(false);
  });
});
