import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ExitCode } from '../../src/cli/exit-codes.js';
import { main } from '../../src/cli/index.js';
import { capture } from '../helpers/cli.js';

const SAMPLE = fileURLToPath(new URL('../fixtures/sample-project', import.meta.url));
const argv = (...rest: string[]): string[] => ['node', 'arch-contract', ...rest];

describe('per-command help', () => {
  it('`check --help` shows command-specific help and runs no command', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv('check', '--help'), c.deps)).toBe(ExitCode.Ok);
    const out = c.out();
    expect(out).toContain('arch-contract check');
    expect(out).toContain('--format');
    expect(out).toContain('EXAMPLES');
    // it must NOT have actually run `check` (which would print the table report)
    expect(out).not.toContain('Architecture violations found');
    expect(out).not.toContain('No architecture violations found');
    expect(c.err()).toBe('');
  });

  it('`presets -h` shows the presets help', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv('presets', '-h'), c.deps)).toBe(ExitCode.Ok);
    expect(c.out()).toContain('arch-contract presets');
    expect(c.out()).toContain('USAGE');
  });

  it('`init --help` shows --preset', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv('init', '--help'), c.deps)).toBe(ExitCode.Ok);
    expect(c.out()).toContain('--preset');
  });

  it('top-level --help still lists the program and commands', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv('--help'), c.deps)).toBe(ExitCode.Ok);
    expect(c.out()).toContain('arch-contract');
    expect(c.out()).toContain('COMMANDS');
    expect(c.out()).toContain('check');
  });

  it('no args prints the top-level help', async () => {
    const c = capture(SAMPLE);
    expect(await main(argv(), c.deps)).toBe(ExitCode.Ok);
    expect(c.out()).toContain('COMMANDS');
  });
});
