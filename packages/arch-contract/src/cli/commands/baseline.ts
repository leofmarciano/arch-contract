import fs from 'node:fs';
import path from 'node:path';

import { buildBaseline, serializeBaseline } from '../../baseline/index.js';
import { runCheck } from '../../core/run-check.js';
import type { Theme } from '../../reporters/theme.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';
import { NO_COLOR_THEME } from '../style.js';

export interface BaselineOptions {
  config?: string;
  out?: string;
  reason?: string;
}

export function runBaselineCommand(
  opts: BaselineOptions,
  deps: CliDeps,
  theme: Theme = NO_COLOR_THEME,
): ExitCode {
  let res;
  try {
    res = runCheck({ cwd: deps.cwd, ...(opts.config !== undefined ? { config: opts.config } : {}) });
  } catch (err) {
    return mapError(err, deps, theme);
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
    deps.stderr.write(
      `${theme.err(`Could not write baseline to ${outPath}`)}: ${(err as Error).message}\n`,
    );
    return ExitCode.ConfigError;
  }

  const ok = theme.enabled ? `${theme.symbolOk()} ` : '';
  deps.stdout.write(
    `${ok}Wrote baseline with ${theme.bold(String(file.ignoredViolations.length))} violation(s) to ${theme.hint(outPath)}.\n`,
  );
  return ExitCode.Ok;
}
