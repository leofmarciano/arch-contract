import { describe, expect, it } from 'vitest';

import { PRESETS } from '../../src/config/presets/index.js';
import { presetFragmentSchema } from '../../src/config/schema.js';

describe('presetFragmentSchema', () => {
  it('accepts a rules/expectations-only fragment (zero layers — the case configSchema rejects)', () => {
    const r = presetFragmentSchema.safeParse({
      expectations: [
        {
          name: 'no-axios',
          expect: { layer: 'domain' },
          to: { notDependOnPackages: ['axios'] },
          severity: 'error',
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('accepts an empty fragment', () => {
    expect(presetFragmentSchema.safeParse({}).success).toBe(true);
  });

  it('rejects unknown / metadata-only top-level keys (strict)', () => {
    expect(presetFragmentSchema.safeParse({ description: 'x' }).success).toBe(false);
    expect(presetFragmentSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(presetFragmentSchema.safeParse({ project: { name: 'x' } }).success).toBe(false);
  });

  it('rejects a malformed layer (missing match)', () => {
    expect(presetFragmentSchema.safeParse({ layers: [{ name: 'a' }] }).success).toBe(false);
  });

  it('exposes exactly the six PresetFragment sections (drift guard)', () => {
    expect(Object.keys(presetFragmentSchema.shape).sort()).toEqual(
      ['expectations', 'layers', 'modules', 'paths', 'rules', 'ruleset'].sort(),
    );
  });

  it('every built-in fragment passes the fragment schema', () => {
    for (const [name, entry] of Object.entries(PRESETS)) {
      const r = presetFragmentSchema.safeParse(entry.fragment);
      expect(r.success, `${name}: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true);
    }
  });
});
