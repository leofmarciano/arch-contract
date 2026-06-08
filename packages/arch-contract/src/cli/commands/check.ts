import { applyBaseline, loadBaseline } from '../../baseline/index.js';
import { runCheck } from '../../core/run-check.js';
import { getReporter, UnknownReporterError } from '../../reporters/index.js';
import type { Theme } from '../../reporters/theme.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';
import { NO_COLOR_THEME } from '../style.js';

export interface CheckOptions {
  config?: string;
  format?: string;
  /** undefined -> follow config.baseline.enabled; true/false -> force */
  baseline?: boolean;
}

export function runCheckCommand(
  opts: CheckOptions,
  deps: CliDeps,
  theme: Theme = NO_COLOR_THEME,
): ExitCode {
  const format = opts.format ?? 'table';
  let reporter;
  try {
    reporter = getReporter(format);
  } catch (err) {
    if (err instanceof UnknownReporterError) {
      deps.stderr.write(`${theme.err(err.message)}\n`);
      return ExitCode.ConfigError;
    }
    throw err;
  }

  let res;
  try {
    res = runCheck({ cwd: deps.cwd, ...(opts.config !== undefined ? { config: opts.config } : {}) });
  } catch (err) {
    return mapError(err, deps, theme);
  }

  let result = res.result;
  const useBaseline = opts.baseline ?? res.config.baseline.enabled;
  if (useBaseline && res.config.baseline.path !== null) {
    const baseline = loadBaseline(res.config.baseline.path);
    if (baseline !== null) result = applyBaseline(result, baseline);
  }

  // Only the human `table` format is themed; machine formats stay byte-stable.
  deps.stdout.write(`${reporter.render(result, format === 'table' ? theme : undefined)}\n`);
  return result.summary.passed ? ExitCode.Ok : ExitCode.Violations;
}
