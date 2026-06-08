import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ExitCode } from '../../src/cli/exit-codes.js';
import { main } from '../../src/cli/index.js';
import { capture } from '../helpers/cli.js';
import { makeTmpDir, rmDir, writeFile } from '../helpers/tmp.js';

const argv = (...rest: string[]): string[] => ['node', 'arch-contract', ...rest];

const dirs: string[] = [];
function project(): string {
  const d = makeTmpDir();
  dirs.push(d);
  writeFile(
    d,
    'arch-contract.yaml',
    `version: 1\nproject:\n  name: t\nlayers:\n  - name: domain\n    match: src/**/*.ts\nagent:\n  enabled: true\n  validationCommand: pnpm arch:check\n`,
  );
  return d;
}
afterEach(() => {
  while (dirs.length) rmDir(dirs.pop() as string);
});

describe('sync-agent-rules command', () => {
  it('writes the architecture-rules block and is then clean under --check', async () => {
    const d = project();

    const c1 = capture(d);
    expect(await main(argv('sync-agent-rules'), c1.deps)).toBe(ExitCode.Ok);
    const content = fs.readFileSync(path.join(d, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('## Architecture Rules (t)');

    const c2 = capture(d);
    expect(await main(argv('sync-agent-rules', '--check'), c2.deps)).toBe(ExitCode.Ok);
  });

  it('--check returns Violations(1) when docs are out of date', async () => {
    const d = project();
    const c = capture(d);
    expect(await main(argv('sync-agent-rules', '--check'), c.deps)).toBe(ExitCode.Violations);
  });

  it('--only-existing does not create new docs', async () => {
    const d = project();
    writeFile(d, 'CLAUDE.md', '# project\n');
    const c = capture(d);
    expect(await main(argv('sync-agent-rules', '--only-existing'), c.deps)).toBe(ExitCode.Ok);
    expect(fs.existsSync(path.join(d, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(d, 'AGENTS.md'))).toBe(false);
  });

  it('reports a config error when no config is found', async () => {
    const d = makeTmpDir();
    dirs.push(d);
    const c = capture(d);
    expect(await main(argv('sync-agent-rules'), c.deps)).toBe(ExitCode.ConfigError);
  });
});
