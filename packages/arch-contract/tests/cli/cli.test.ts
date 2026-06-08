import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { main } from '../../src/cli/index.js';
import { ExitCode } from '../../src/cli/exit-codes.js';
import { VERSION } from '../../src/index.js';
import { capture } from '../helpers/cli.js';
import { makeTmpDir, rmDir, writeFile } from '../helpers/tmp.js';

const SAMPLE = fileURLToPath(new URL('../fixtures/sample-project', import.meta.url));
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

/** A small writable project with a single layer-boundary violation. */
function project(extraConfig = ''): string {
  const d = tmp();
  writeFile(
    d,
    'arch-contract.yaml',
    `version: 1\nproject:\n  name: t\nlayers:\n  - name: domain\n    match: src/domain/**/*.ts\n  - name: infra\n    match: src/infra/**/*.ts\nruleset:\n  domain:\n    mayDependOn: []\n  infra:\n    mayDependOn: [domain]\n${extraConfig}`,
  );
  writeFile(d, 'src/domain/Bad.ts', `import { Db } from '../infra/Db';\nexport const x = Db;`);
  writeFile(d, 'src/infra/Db.ts', `export class Db {}`);
  return d;
}

describe('check command', () => {
  it('exits 1 (Violations) on the sample fixture', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv('check'), c.deps)).toBe(ExitCode.Violations);
    expect(c.out()).toContain('layer-boundary');
  });

  it('--format json prints the {summary, violations} shape', async () => {
    const c = capture(SAMPLE);
    await main(argv('check', '--format', 'json'), c.deps);
    const parsed = JSON.parse(c.out());
    expect(parsed.summary.errors).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(parsed.violations)).toBe(true);
  });

  it('--format github emits annotations', async () => {
    const c = capture(SAMPLE);
    await main(argv('check', '--format', 'github'), c.deps);
    expect(c.out()).toContain('::error file=src/domain/Tainted.ts');
  });

  it('returns ConfigError (2) for an unknown format', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv('check', '--format', 'xml'), c.deps)).toBe(ExitCode.ConfigError);
  });

  it('returns ConfigError (2) when no config is found', async () => {
    const c = capture(tmp());
    expect(await main(argv('check', '--no-baseline'), c.deps)).toBe(ExitCode.ConfigError);
  });
});

describe('baseline + check --use-baseline roundtrip', () => {
  it('suppresses baselined violations but fails on a new one', async () => {
    const d = project('baseline: arch-contract-baseline.yaml\n');

    const b = capture(d);
    expect(await main(argv('baseline'), b.deps)).toBe(ExitCode.Ok);
    expect(fs.existsSync(path.join(d, 'arch-contract-baseline.yaml'))).toBe(true);

    const c1 = capture(d);
    expect(await main(argv('check', '--use-baseline'), c1.deps)).toBe(ExitCode.Ok);

    const c2 = capture(d);
    expect(await main(argv('check', '--no-baseline'), c2.deps)).toBe(ExitCode.Violations);
  });
});

describe('init command', () => {
  it('scaffolds arch-contract.yaml then refuses to overwrite without --force', async () => {
    const d = tmp();
    const c1 = capture(d);
    expect(await main(argv('init'), c1.deps)).toBe(ExitCode.Ok);
    expect(fs.existsSync(path.join(d, 'arch-contract.yaml'))).toBe(true);

    const c2 = capture(d);
    await main(argv('init'), c2.deps);
    expect(c2.err()).toMatch(/Refusing to overwrite/);

    const c3 = capture(d);
    expect(await main(argv('init', '--force'), c3.deps)).toBe(ExitCode.Ok);
  });

  it('the scaffolded config validates', async () => {
    const d = tmp();
    await main(argv('init'), capture(d).deps);
    const c = capture(d);
    expect(await main(argv('validate-config'), c.deps)).toBe(ExitCode.Ok);
  });
});

describe('validate-config command', () => {
  it('returns Ok for a valid config', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv('validate-config'), c.deps)).toBe(ExitCode.Ok);
    expect(c.out()).toMatch(/Config OK/);
  });

  it('returns ConfigError for an invalid config', async () => {
    const d = tmp();
    writeFile(d, 'arch-contract.yaml', 'version: 1\nlayers: []\n');
    const c = capture(d);
    expect(await main(argv('validate-config'), c.deps)).toBe(ExitCode.ConfigError);
  });
});

describe('graph / explain commands', () => {
  it('graph prints a mermaid flowchart', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv('graph'), c.deps)).toBe(ExitCode.Ok);
    expect(c.out()).toContain('graph TD');
    expect(c.out()).toContain('application --> domain');
  });

  it('explain describes a known rule and rejects an unknown one', async () => {
    const ok = capture(SAMPLE);
    expect(await main(argv('explain', 'layer-boundary'), ok.deps)).toBe(ExitCode.Ok);
    const bad = capture(SAMPLE);
    expect(await main(argv('explain', 'nope'), bad.deps)).toBe(ExitCode.ConfigError);
  });
});

describe('top-level dispatch', () => {
  it('--help returns Ok and prints usage', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv('--help'), c.deps)).toBe(ExitCode.Ok);
    expect(c.out()).toContain('arch-contract');
  });

  it('--version prints the version', async () => {
    const c = capture(SAMPLE);
    await main(argv('--version'), c.deps);
    // assert against the source-of-truth constant so a version bump never breaks this
    expect(c.out().trim()).toBe(VERSION);
  });

  it('an unknown command returns ConfigError', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv('bogus'), c.deps)).toBe(ExitCode.ConfigError);
  });
});
