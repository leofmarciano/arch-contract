import fs from 'node:fs';
import path from 'node:path';

import { buildBaseline, serializeBaseline } from '../../baseline/index.js';
import { runCheck } from '../../core/run-check.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';

export interface BaselineOptions {
  config?: string;
  out?: string;
  reason?: string;
}

export function runBaselineCommand(opts: BaselineOptions, deps: CliDeps): ExitCode {
  let res;
  try {
    res = runCheck({ cwd: deps.cwd, ...(opts.config !== undefined ? { config: opts.config } : {}) });
  } catch (err) {
    return mapError(err, deps);
  }

  const file = buildBaseline(res.result.violations, {
    now: deps.now(),
    ...(opts.reason !== undefined ? { reason: opts.reason } : {}),
  });

  const outPath =
    opts.out !== undefined
      ? path.resolve(deps.cwd, opts.out)
      : (res.config.baseline.path ?? path.resolve(res.config.rootDir, 'arch-contract-baseline.yaml'));

  try {
    fs.writeFileSync(outPath, serializeBaseline(file), 'utf8');
  } catch (err) {
    deps.stderr.write(`Could not write baseline to ${outPath}: ${(err as Error).message}\n`);
    return ExitCode.ConfigError;
  }

  deps.stdout.write(
    `Wrote baseline with ${file.ignoredViolations.length} violation(s) to ${outPath}.\n`,
  );
  return ExitCode.Ok;
}
