import { describe, expect, it } from 'vitest';

import { DEFAULT_EXCLUDES } from '../../src/config/model.js';
import { matchesGlobs } from '../../src/project/file-discovery.js';

describe('matchesGlobs', () => {
  it('matches files inside an included bare directory', () => {
    expect(matchesGlobs('src/a/b.ts', ['src'], [])).toBe(true);
    expect(matchesGlobs('test/x.ts', ['src'], [])).toBe(false);
  });

  it('supports explicit glob includes', () => {
    expect(matchesGlobs('src/a/b.ts', ['src/**/*.ts'], [])).toBe(true);
  });

  it('applies excludes', () => {
    expect(matchesGlobs('src/a.spec.ts', ['src'], ['**/*.spec.ts'])).toBe(false);
    expect(matchesGlobs('src/a.ts', ['src'], ['**/*.spec.ts'])).toBe(true);
  });

  it('drops .d.ts files regardless of includes', () => {
    expect(matchesGlobs('src/a.d.ts', ['src'], [])).toBe(false);
  });

  it('honors DEFAULT_EXCLUDES for tests and node_modules', () => {
    expect(matchesGlobs('src/a.test.ts', ['src'], DEFAULT_EXCLUDES)).toBe(false);
    expect(matchesGlobs('node_modules/x/index.ts', ['.'], DEFAULT_EXCLUDES)).toBe(false);
  });

  it('matches dotfiles', () => {
    expect(matchesGlobs('src/.internal/a.ts', ['src'], [])).toBe(true);
  });
});
