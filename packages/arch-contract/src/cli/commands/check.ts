import { applyBaseline, loadBaseline } from '../../baseline/index.js';
import { runCheck } from '../../core/run-check.js';
import { getReporter, UnknownReporterError } from '../../reporters/index.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';

export interface CheckOptions {
  config?: string;
  format?: string;
  /** undefined -> follow config.baseline.enabled; true/false -> force */
  baseline?: boolean;
}

export function runCheckCommand(opts: CheckOptions, deps: CliDeps): ExitCode {
  const format = opts.format ?? 'table';
  let reporter;
  try {
    reporter = getReporter(format);
  } catch (err) {
    if (err instanceof UnknownReporterError) {
      deps.stderr.write(`${err.message}\n`);
      return ExitCode.ConfigError;
    }
    throw err;
  }

  let res;
  try {
    res = runCheck({ cwd: deps.cwd, ...(opts.config !== undefined ? { config: opts.config } : {}) });
  } catch (err) {
    return mapError(err, deps);
  }

  let result = res.result;
  const useBaseline = opts.baseline ?? res.config.baseline.enabled;
  if (useBaseline && res.config.baseline.path !== null) {
    const baseline = loadBaseline(res.config.baseline.path);
    if (baseline !== null) result = applyBaseline(result, baseline);
  }

  deps.stdout.write(`${reporter.render(result)}\n`);
  return result.summary.passed ? ExitCode.Ok : ExitCode.Violations;
}
