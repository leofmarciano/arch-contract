export interface OutputSink {
  write(text: string): void;
}

/** Injection seam so commands return an ExitCode and write through deps, never touching process IO directly. */
export interface CliDeps {
  cwd: string;
  stdout: OutputSink;
  stderr: OutputSink;
  now(): Date;
}

export function defaultDeps(): CliDeps {
  return {
    cwd: process.cwd(),
    stdout: { write: (s) => void process.stdout.write(s) },
    stderr: { write: (s) => void process.stderr.write(s) },
    now: () => new Date(),
  };
}
