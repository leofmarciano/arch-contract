export enum ExitCode {
  Ok = 0,
  Violations = 1,
  ConfigError = 2,
}

/** Thrown for configuration problems the CLI maps to exit code 2. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
