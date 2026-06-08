import { ConfigValidationError, loadAndValidate } from '../../config/index.js';
import type { Theme } from '../../reporters/theme.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';
import { NO_COLOR_THEME } from '../style.js';

export interface ValidateConfigOptions {
  config?: string;
}

export function runValidateConfigCommand(
  opts: ValidateConfigOptions,
  deps: CliDeps,
  theme: Theme = NO_COLOR_THEME,
): ExitCode {
  try {
    const { config, sourcePath } = loadAndValidate({
      cwd: deps.cwd,
      ...(opts.config !== undefined ? { explicitPath: opts.config } : {}),
    });
    const ok = theme.enabled ? `${theme.symbolOk()} ` : '';
    const counts = `${config.layers.length} layers, ${config.rules.length} rules, ${config.expectations.length} expectations`;
    deps.stdout.write(`${ok}${theme.ok('Config OK')}: ${theme.hint(sourcePath)} ${theme.hint(`(${counts}).`)}\n`);
    return ExitCode.Ok;
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      deps.stderr.write(`${theme.err(err.message)}\n`);
      return ExitCode.ConfigError;
    }
    return mapError(err, deps, theme);
  }
}
