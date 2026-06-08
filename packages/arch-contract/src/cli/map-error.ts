import { ConfigNotFoundError, ConfigParseError, ConfigValidationError } from '../config/index.js';
import { InvalidPresetError, PresetLoadError, UnknownPresetError } from '../config/errors.js';
import type { Theme } from '../reporters/theme.js';
import type { CliDeps } from './deps.js';
import { ConfigError, ExitCode } from './exit-codes.js';
import { NO_COLOR_THEME } from './style.js';

/** Map a thrown error to an ExitCode, writing a (theme-colored) message to stderr. */
export function mapError(err: unknown, deps: CliDeps, theme: Theme = NO_COLOR_THEME): ExitCode {
  if (
    err instanceof ConfigNotFoundError ||
    err instanceof ConfigParseError ||
    err instanceof ConfigValidationError ||
    err instanceof UnknownPresetError ||
    err instanceof PresetLoadError ||
    err instanceof InvalidPresetError ||
    err instanceof ConfigError
  ) {
    deps.stderr.write(`${theme.err(err.message)}\n`);
    return ExitCode.ConfigError;
  }
  deps.stderr.write(`${theme.err('arch-contract')}: ${(err as Error).message}\n`);
  return ExitCode.Violations;
}
