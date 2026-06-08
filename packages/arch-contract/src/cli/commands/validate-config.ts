import { ConfigValidationError, loadAndValidate } from '../../config/index.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';

export interface ValidateConfigOptions {
  config?: string;
}

export function runValidateConfigCommand(opts: ValidateConfigOptions, deps: CliDeps): ExitCode {
  try {
    const { config, sourcePath } = loadAndValidate({
      cwd: deps.cwd,
      ...(opts.config !== undefined ? { explicitPath: opts.config } : {}),
    });
    deps.stdout.write(
      `Config OK: ${sourcePath} (${config.layers.length} layers, ${config.rules.length} rules, ${config.expectations.length} expectations).\n`,
    );
    return ExitCode.Ok;
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      deps.stderr.write(`${err.message}\n`);
      return ExitCode.ConfigError;
    }
    return mapError(err, deps);
  }
}
