export interface ConfigIssue {
  /** dotted path into the config, e.g. `expectations.0.to` */
  path: string;
  message: string;
}

/** No config file could be located by discovery. */
export class ConfigNotFoundError extends Error {
  readonly searched: string[];
  constructor(searched: string[]) {
    super(
      `No arch-contract config found. Searched:\n${searched.map((s) => `  - ${s}`).join('\n')}`,
    );
    this.name = 'ConfigNotFoundError';
    this.searched = searched;
  }
}

/** The config file is not valid YAML, or its root is not a mapping. */
export class ConfigParseError extends Error {
  readonly configPath: string;
  readonly line?: number;
  readonly column?: number;
  constructor(configPath: string, message: string, line?: number, column?: number) {
    super(message);
    this.name = 'ConfigParseError';
    this.configPath = configPath;
    if (line !== undefined) this.line = line;
    if (column !== undefined) this.column = column;
  }
}

/** The config is structurally or semantically invalid. Carries every issue. */
export class ConfigValidationError extends Error {
  readonly issues: ConfigIssue[];
  readonly configPath: string;
  constructor(configPath: string, issues: ConfigIssue[]) {
    super(`Invalid arch-contract config (${issues.length} issue(s)):\n${formatIssues(issues)}`);
    this.name = 'ConfigValidationError';
    this.configPath = configPath;
    this.issues = issues;
  }
}

export function formatIssues(issues: ConfigIssue[]): string {
  return issues.map((i) => `  - ${i.path || '(root)'}: ${i.message}`).join('\n');
}
