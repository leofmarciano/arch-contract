import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { InvalidPresetError, PresetLoadError } from '../../src/config/errors.js';
import { resolveExternalPreset } from '../../src/config/presets/resolve-external.js';
import { validateConfig } from '../../src/config/validate-config.js';
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

/** Write a fake installed package into `dir/node_modules/<name>`. */
function installPkg(dir: string, name: string, body: string, opts: { type?: string; main?: string } = {}): void {
  const main = opts.main ?? 'index.cjs';
  const pkg: Record<string, unknown> = { name, version: '1.0.0', main };
  if (opts.type !== undefined) pkg['type'] = opts.type;
  writeFile(dir, `node_modules/${name}/package.json`, JSON.stringify(pkg));
  writeFile(dir, `node_modules/${name}/${main}`, body);
}

/** Resolve a config whose presets reference external packages/paths in `dir`. */
function resolveFrom(dir: string, presets: unknown) {
  return validateConfig({
    raw: { version: 1, project: { name: 'demo' }, presets },
    configPath: path.join(dir, 'arch-contract.yaml'),
    text: '',
  }).config;
}

describe('external presets — resolution', () => {
  it('loads a local .cjs preset (bare fragment) and merges its layers', () => {
    const d = tmp();
    writeFile(
      d,
      'presets/p.cjs',
      `module.exports = { layers: [{ name: 'core', match: ['src/**'] }], ruleset: { core: { mayDependOn: [] } } };`,
    );
    const config = resolveFrom(d, ['./presets/p.cjs']);
    expect(config.layers.map((l) => l.name)).toContain('core');
  });

  it('loads an installed package by bare name and honors { meta, fragment }', () => {
    const d = tmp();
    installPkg(
      d,
      'arch-contract-preset-demo',
      `module.exports = { meta: { name: 'demo', basedOn: 'clean-architecture', oneLine: 'x' }, fragment: { layers: [{ name: 'domain', match: ['src/domain/**'] }] } };`,
    );
    const r = resolveExternalPreset('arch-contract-preset-demo', d);
    expect(r.meta?.basedOn).toBe('clean-architecture');
    expect(r.fragment.layers?.[0]?.name).toBe('domain');
    expect(resolveFrom(d, ['arch-contract-preset-demo']).layers.map((l) => l.name)).toContain('domain');
  });

  it('supports a scoped package name', () => {
    const d = tmp();
    installPkg(d, '@acme/arch-contract-preset-x', `module.exports = { layers: [{ name: 'scoped', match: ['x'] }] };`);
    expect(resolveExternalPreset('@acme/arch-contract-preset-x', d).fragment.layers?.[0]?.name).toBe('scoped');
  });

  it('supports default-export interop (mod.default)', () => {
    const d = tmp();
    installPkg(d, 'arch-contract-preset-def', `module.exports = { default: { layers: [{ name: 'l', match: ['x'] }] } };`);
    expect(resolveExternalPreset('arch-contract-preset-def', d).fragment.layers?.[0]?.name).toBe('l');
  });

  it('throws PresetLoadError (MODULE_NOT_FOUND) when the package is not installed', () => {
    const d = tmp();
    expect(() => resolveExternalPreset('arch-contract-preset-missing', d)).toThrow(PresetLoadError);
    try {
      resolveExternalPreset('arch-contract-preset-missing', d);
      expect.unreachable();
    } catch (err) {
      expect((err as PresetLoadError).code).toBe('MODULE_NOT_FOUND');
      expect((err as Error).message).toContain('arch-contract-preset-missing');
      expect((err as Error).message).toContain(d);
    }
  });

  it('throws InvalidPresetError when the fragment is malformed (layer missing match)', () => {
    const d = tmp();
    installPkg(d, 'arch-contract-preset-bad', `module.exports = { layers: [{ name: 'a' }] };`);
    expect(() => resolveExternalPreset('arch-contract-preset-bad', d)).toThrow(InvalidPresetError);
  });

  it('rejects metadata / config-only keys in a fragment (strict)', () => {
    const d = tmp();
    installPkg(d, 'arch-contract-preset-meta', `module.exports = { version: 1, layers: [{ name: 'a', match: ['x'] }] };`);
    expect(() => resolveExternalPreset('arch-contract-preset-meta', d)).toThrow(InvalidPresetError);
  });

  it('errors with a CommonJS hint for an ESM preset that uses top-level await', () => {
    const d = tmp();
    installPkg(
      d,
      'arch-contract-preset-esm',
      `await Promise.resolve();\nexport default { layers: [{ name: 'l', match: ['x'] }] };`,
      { type: 'module', main: 'index.mjs' },
    );
    try {
      resolveExternalPreset('arch-contract-preset-esm', d);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(PresetLoadError);
      expect((err as Error).message).toMatch(/CommonJS|top-level await/i);
    }
  });

  it('built-ins take precedence over an installed package of the same name', () => {
    const d = tmp();
    installPkg(d, 'clean-architecture', `module.exports = { layers: [{ name: 'IMPOSTER', match: ['x'] }] };`);
    const names = resolveFrom(d, ['clean-architecture']).layers.map((l) => l.name);
    expect(names).not.toContain('IMPOSTER');
    expect(names).toContain('domain'); // the real built-in
  });

  it('the same external preset listed twice resolves once (no duplicate layers)', () => {
    const d = tmp();
    installPkg(d, 'arch-contract-preset-twice', `module.exports = { layers: [{ name: 'core', match: ['src/**'] }] };`);
    const config = resolveFrom(d, ['arch-contract-preset-twice', 'arch-contract-preset-twice']);
    expect(config.layers.filter((l) => l.name === 'core')).toHaveLength(1);
  });
});
