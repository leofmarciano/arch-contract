import { describe, expect, it } from 'vitest';

import pkg from '../package.json' with { type: 'json' };
import { VERSION } from '../src/index.js';

describe('scaffolding smoke', () => {
  it('exposes a semver version string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('keeps VERSION in sync with package.json (guards CLI --version drift)', () => {
    expect(VERSION).toBe(pkg.version);
  });
});
