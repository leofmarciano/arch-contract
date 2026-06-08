export interface OutputSink {
  write(text: string): void;
}

/** Injection seam so commands return an ExitCode and write through deps, never touching process IO directly. */
export interface CliDeps {
  cwd: string;
  stdout: OutputSink;
  stderr: OutputSink;
  now(): Date;
  /** Whether ANSI color is allowed (TTY + not NO_COLOR). `main` may still override via flags. */
  color: boolean;
  /** Terminal width for wrapping/truncation; 80 when not a TTY. */
  width: number;
}

/** Resolve the base color decision from the environment (argv flags override later, in `main`). */
function envColor(): boolean {
  if (process.env['NO_COLOR'] !== undefined && process.env['NO_COLOR'] !== '') return false;
  if (process.env['FORCE_COLOR'] !== undefined && process.env['FORCE_COLOR'] !== '') return true;
  return Boolean(process.stdout.isTTY);
}

export function defaultDeps(): CliDeps {
  return {
    cwd: process.cwd(),
    stdout: { write: (s) => void process.stdout.write(s) },
    stderr: { write: (s) => void process.stderr.write(s) },
    now: () => new Date(),
    color: envColor(),
    width: process.stdout.columns ?? 80,
  };
}
