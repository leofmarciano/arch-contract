import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { main } from '../../src/cli/index.js';
import { ExitCode } from '../../src/cli/exit-codes.js';
import { capture } from '../helpers/cli.js';
import { makeTmpDir, rmDir, writeFile } from '../helpers/tmp.js';

const argv = (...rest: string[]): string[] => ['node', 'arch-contract', ...rest];

const dirs: string[] = [];
function tmp(): string {
  const d = makeTmpDir();
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) rmDir(dirs.pop() as string);
});

describe('presets command', () => {
  it('lists all 10 presets and excludes the internal base', async () => {
    const c = capture(tmp());
    expect(await main(argv('presets'), c.deps)).toBe(ExitCode.Ok);
    for (const name of [
      'clean-architecture',
      'hexagonal',
      'node-service',
      'nestjs-clean',
      'nest-js',
      'nextjs',
      'tanstack-starter',
      'adonisjs',
      'elysiajs',
      'encore-ts',
    ]) {
      expect(c.out()).toContain(name);
    }
    expect(c.out()).not.toContain('_clean-arch-base');
  });

  it('shows a single preset detail (layers + ruleset)', async () => {
    const c = capture(tmp());
    expect(await main(argv('presets', 'hexagonal'), c.deps)).toBe(ExitCode.Ok);
    expect(c.out()).toContain('Layers:');
    expect(c.out()).toContain('adapters-primary');
    expect(c.out()).toContain('Ruleset');
  });

  it('returns ConfigError + did-you-mean for an unknown preset', async () => {
    const c = capture(tmp());
    expect(await main(argv('presets', 'hexagonol'), c.deps)).toBe(ExitCode.ConfigError);
    expect(c.err()).toMatch(/Did you mean "hexagonal"/);
  });
});

describe('init --preset', () => {
  it('scaffolds a config that references the preset and validates', async () => {
    const d = tmp();
    const c1 = capture(d);
    expect(await main(argv('init', '--preset', 'clean-architecture'), c1.deps)).toBe(ExitCode.Ok);
    const yaml = fs.readFileSync(path.join(d, 'arch-contract.yaml'), 'utf8');
    expect(yaml).toContain('presets:');
    expect(yaml).toContain('clean-architecture');

    const c2 = capture(d);
    expect(await main(argv('validate-config'), c2.deps)).toBe(ExitCode.Ok);
  });

  it('refuses an unknown preset and writes nothing', async () => {
    const d = tmp();
    const c = capture(d);
    expect(await main(argv('init', '--preset', 'nope'), c.deps)).toBe(ExitCode.ConfigError);
    expect(fs.existsSync(path.join(d, 'arch-contract.yaml'))).toBe(false);
  });
});

describe('check with a preset config', () => {
  it('runs the preset rules and fails on a domain framework import', async () => {
    const d = tmp();
    fs.writeFileSync(
      path.join(d, 'arch-contract.yaml'),
      'version: 1\nproject: { name: t }\npresets: [clean-architecture]\n',
    );
    fs.mkdirSync(path.join(d, 'src/domain/entities'), { recursive: true });
    fs.writeFileSync(
      path.join(d, 'src/domain/entities/Bad.ts'),
      `import axios from 'axios';\nexport class Bad { x = axios; }`,
    );
    const c = capture(d);
    expect(await main(argv('check', '--no-baseline', '--format', 'json'), c.deps)).toBe(
      ExitCode.Violations,
    );
    expect(c.out()).toContain('domain-is-framework-free');
  });
});

/** Write a fake installed preset package into `dir/node_modules/<name>`. */
function installPreset(dir: string, name: string, body: string): void {
  writeFile(dir, `node_modules/${name}/package.json`, JSON.stringify({ name, version: '1.0.0', main: 'index.cjs' }));
  writeFile(dir, `node_modules/${name}/index.cjs`, body);
}

describe('external presets — CLI', () => {
  it('presets <pkg> shows an installed external preset', async () => {
    const d = tmp();
    installPreset(
      d,
      'arch-contract-preset-acme',
      `module.exports = { meta: { name: 'acme', basedOn: 'clean-architecture', oneLine: 'Acme rules' }, fragment: { layers: [{ name: 'adapters', match: ['src/adapters/**'] }], ruleset: { adapters: { mayDependOn: [] } } } };`,
    );
    const c = capture(d);
    expect(await main(argv('presets', 'arch-contract-preset-acme'), c.deps)).toBe(ExitCode.Ok);
    expect(c.out()).toContain('external preset');
    expect(c.out()).toContain('adapters');
  });

  it('presets <pkg> returns ConfigError for an uninstalled external preset', async () => {
    const c = capture(tmp());
    expect(await main(argv('presets', 'arch-contract-preset-missing'), c.deps)).toBe(ExitCode.ConfigError);
    expect(c.err()).toMatch(/Could not load preset|MODULE_NOT_FOUND/);
  });

  it('init --preset <pkg> scaffolds an external preset (not installed) with an install note', async () => {
    const d = tmp();
    const c = capture(d);
    expect(await main(argv('init', '--preset', 'arch-contract-preset-acme'), c.deps)).toBe(ExitCode.Ok);
    const yaml = fs.readFileSync(path.join(d, 'arch-contract.yaml'), 'utf8');
    expect(yaml).toContain('arch-contract-preset-acme');
    expect(c.out()).toMatch(/npm i -D arch-contract-preset-acme/);
  });

  it('check runs an installed external preset and fails on a banned import', async () => {
    const d = tmp();
    installPreset(
      d,
      'arch-contract-preset-acme',
      `module.exports = { fragment: { layers: [{ name: 'domain', match: ['src/domain/**'] }], expectations: [{ name: 'domain-no-axios', expect: { layer: 'domain' }, to: { notDependOnPackages: ['axios'] }, severity: 'error' }] } };`,
    );
    writeFile(d, 'arch-contract.yaml', 'version: 1\nproject: { name: t }\npresets: [arch-contract-preset-acme]\n');
    writeFile(d, 'src/domain/Bad.ts', `import axios from 'axios';\nexport class Bad { x = axios; }`);
    const c = capture(d);
    expect(await main(argv('check', '--no-baseline', '--format', 'json'), c.deps)).toBe(ExitCode.Violations);
    expect(c.out()).toContain('domain-no-axios');
  });
});
