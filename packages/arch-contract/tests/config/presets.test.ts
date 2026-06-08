import { describe, expect, it } from 'vitest';

import { PresetLoadError, UnknownPresetError } from '../../src/config/errors.js';
import { applyPresets, looksExternal, mergeFragment } from '../../src/config/presets.js';
import { validateConfig } from '../../src/config/validate-config.js';

function source(raw: unknown) {
  return { raw, configPath: '/proj/arch-contract.yaml', text: '' };
}

describe('mergeFragment', () => {
  it('dedupes layers by name; override replaces keeping base position', () => {
    const base = { layers: [{ name: 'a', match: ['x'] }, { name: 'b', match: ['y'] }] };
    const over = { layers: [{ name: 'a', match: ['z'] }, { name: 'c', match: ['w'] }] };
    const merged = mergeFragment(base, over) as { layers: Array<{ name: string; match: string[] }> };
    expect(merged.layers.map((l) => l.name)).toEqual(['a', 'b', 'c']);
    expect(merged.layers[0]?.match).toEqual(['z']); // a replaced, position kept
  });

  it('overrides rules and expectations by name', () => {
    const base = { rules: [{ name: 'r', type: 'no-cycles' }], expectations: [{ name: 'e', x: 1 }] };
    const over = { rules: [{ name: 'r', type: 'no-cycles', scope: 'module' }], expectations: [{ name: 'f' }] };
    const merged = mergeFragment(base, over) as { rules: Array<{ name: string; scope?: string }>; expectations: unknown[] };
    expect(merged.rules).toHaveLength(1);
    expect(merged.rules[0]?.scope).toBe('module');
    expect(merged.expectations).toHaveLength(2);
  });

  it('replaces ruleset per-layer (not union)', () => {
    const base = { ruleset: { infra: { mayDependOn: ['a', 'b'] }, domain: { mayDependOn: [] } } };
    const over = { ruleset: { infra: { mayDependOn: ['a'] } } };
    const merged = mergeFragment(base, over) as { ruleset: Record<string, { mayDependOn: string[] }> };
    expect(merged.ruleset['infra']?.mayDependOn).toEqual(['a']); // replaced, not unioned
    expect(merged.ruleset['domain']).toBeDefined();
  });

  it('replaces paths.include but concatenates+dedupes paths.exclude', () => {
    const base = { paths: { include: ['src'], exclude: ['**/*.spec.ts'] } };
    const over = { paths: { include: ['app'], exclude: ['**/*.spec.ts', '**/*.test.ts'] } };
    const merged = mergeFragment(base, over) as { paths: { include: string[]; exclude: string[] } };
    expect(merged.paths.include).toEqual(['app']);
    expect(merged.paths.exclude).toEqual(['**/*.spec.ts', '**/*.test.ts']);
  });

  it('takes non-mergeable keys (version/project) from override', () => {
    const merged = mergeFragment({ layers: [{ name: 'a', match: ['x'] }] }, { version: 1, project: { name: 'p' } }) as Record<string, unknown>;
    expect(merged['version']).toBe(1);
    expect(merged['project']).toEqual({ name: 'p' });
    expect(merged['layers']).toHaveLength(1);
  });
});

describe('applyPresets', () => {
  it('strips the presets key and merges the fragment under the user config', () => {
    const out = applyPresets({ version: 1, project: { name: 'x' }, presets: ['clean-architecture'] }) as Record<string, unknown>;
    expect('presets' in out).toBe(false);
    expect(Array.isArray(out['layers'])).toBe(true);
    expect(out['version']).toBe(1);
  });

  it('accepts a single string preset', () => {
    const out = applyPresets({ version: 1, project: { name: 'x' }, presets: 'hexagonal' }) as Record<string, unknown>;
    expect(Array.isArray(out['layers'])).toBe(true);
  });

  it('lets the user config override the preset (user layer wins)', () => {
    const out = applyPresets({
      version: 1,
      project: { name: 'x' },
      presets: ['clean-architecture'],
      layers: [{ name: 'domain', match: ['lib/domain/**'] }],
    }) as { layers: Array<{ name: string; match: string[] }> };
    const domain = out.layers.find((l) => l.name === 'domain');
    expect(domain?.match).toEqual(['lib/domain/**']);
  });

  it('throws UnknownPresetError (with did-you-mean) for a typo', () => {
    try {
      applyPresets({ version: 1, project: { name: 'x' }, presets: ['clean-architecure'] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(UnknownPresetError);
      expect((err as UnknownPresetError).suggestion).toBe('clean-architecture');
      expect((err as UnknownPresetError).available).toContain('hexagonal');
    }
  });

  it('returns raw unchanged when there is no presets key', () => {
    const raw = { version: 1, project: { name: 'x' }, layers: [{ name: 'a', match: 'src/**' }] };
    expect(applyPresets(raw)).toBe(raw);
  });

  it('throws PresetLoadError for an external-looking name that is not installed', () => {
    expect(() =>
      applyPresets(
        { version: 1, project: { name: 'x' }, presets: ['arch-contract-preset-nope'] },
        process.cwd(),
      ),
    ).toThrow(PresetLoadError);
  });
});

describe('looksExternal', () => {
  it('classifies packages, scoped packages and paths as external', () => {
    expect(looksExternal('arch-contract-preset-foo')).toBe(true);
    expect(looksExternal('@acme/arch-contract-preset-x')).toBe(true);
    expect(looksExternal('@acme/whatever')).toBe(true);
    expect(looksExternal('./presets/x.cjs')).toBe(true);
    expect(looksExternal('/abs/x.cjs')).toBe(true);
  });

  it('does NOT classify bare names / built-ins as external (preserves typo DX)', () => {
    expect(looksExternal('clean-architecture')).toBe(false);
    expect(looksExternal('clean-architecure')).toBe(false); // typo → UnknownPresetError, not a package
    expect(looksExternal('foo')).toBe(false);
  });

  it('the stripped+merged object passes the strict schema (no unrecognized key)', () => {
    expect(() =>
      validateConfig(source({ version: 1, project: { name: 'x' }, presets: ['node-service'] })),
    ).not.toThrow();
  });
});
