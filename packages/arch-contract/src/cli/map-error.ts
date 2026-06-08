import { ConfigNotFoundError, ConfigParseError, ConfigValidationError } from '../config/index.js';
import { UnknownPresetError } from '../config/errors.js';
import type { CliDeps } from './deps.js';
import { ConfigError, ExitCode } from './exit-codes.js';

/** Map a thrown error to an ExitCode, writing a message to stderr. */
export function mapError(err: unknown, deps: CliDeps): ExitCode {
  if (
    err instanceof ConfigNotFoundError ||
    err instanceof ConfigParseError ||
    err instanceof ConfigValidationError ||
    err instanceof UnknownPresetError ||
    err instanceof ConfigError
  ) {
    deps.stderr.write(`${err.message}\n`);
    return ExitCode.ConfigError;
  }
  deps.stderr.write(`arch-contract: ${(err as Error).message}\n`);
  return ExitCode.Violations;
}
