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

function projectWithAgent(): string {
  const d = tmp();
  writeFile(
    d,
    'arch-contract.yaml',
    `version: 1\nproject:\n  name: t\nlayers:\n  - name: domain\n    match: src/**\nagent:\n  enabled: true\n  validationCommand: pnpm arch:check\n  updateDocs:\n    - AGENTS.md\n  instructions:\n    - Run pnpm arch:check after every task.\n`,
  );
  return d;
}

describe('sync-agent-docs command', () => {
  it('creates the agent doc and is then clean under --check', async () => {
    const d = projectWithAgent();

    const c1 = capture(d);
    expect(await main(argv('sync-agent-docs'), c1.deps)).toBe(ExitCode.Ok);
    expect(fs.existsSync(path.join(d, 'AGENTS.md'))).toBe(true);

    const c2 = capture(d);
    expect(await main(argv('sync-agent-docs', '--check'), c2.deps)).toBe(ExitCode.Ok);
  });

  it('--check returns Violations(1) when the doc is out of date', async () => {
    const d = projectWithAgent();
    const c = capture(d);
    expect(await main(argv('sync-agent-docs', '--check'), c.deps)).toBe(ExitCode.Violations);
  });
});

describe('agent-instructions command', () => {
  it('prints the raw instruction block', async () => {
    const d = projectWithAgent();
    const c = capture(d);
    expect(await main(argv('agent-instructions'), c.deps)).toBe(ExitCode.Ok);
    expect(c.out()).toContain('pnpm arch:check');
    expect(c.out()).not.toContain(':start -->'); // raw body, no markers
  });
});
