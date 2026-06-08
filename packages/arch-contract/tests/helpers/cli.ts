import type { CliDeps } from '../../src/cli/deps.js';

export interface Capture {
  deps: CliDeps;
  out(): string;
  err(): string;
}

export function capture(cwd: string, now = new Date('2026-06-08T00:00:00.000Z')): Capture {
  let o = '';
  let e = '';
  const deps: CliDeps = {
    cwd,
    stdout: { write: (s) => void (o += s) },
    stderr: { write: (s) => void (e += s) },
    now: () => now,
    color: false,
    width: 80,
  };
  return { deps, out: () => o, err: () => e };
}
