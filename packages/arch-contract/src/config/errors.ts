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

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr.push(Math.min((curr[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost));
    }
    prev = curr;
  }
  return prev[b.length] ?? 0;
}

/** Closest candidate within an edit-distance threshold, for "did you mean" hints. */
export function closestMatch(value: string, candidates: string[]): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(value, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best !== undefined && bestDist <= Math.max(2, Math.floor(value.length / 3)) ? best : undefined;
}

/** A config referenced a preset that is not in the built-in registry. */
export class UnknownPresetError extends Error {
  readonly presetName: string;
  readonly available: string[];
  readonly suggestion: string | undefined;
  constructor(presetName: string, available: string[]) {
    const suggestion = closestMatch(presetName, available);
    const didYouMean = suggestion !== undefined ? ` Did you mean "${suggestion}"?` : '';
    super(
      `Unknown preset "${presetName}".${didYouMean}\nAvailable presets: ${available.join(', ')}.`,
    );
    this.name = 'UnknownPresetError';
    this.presetName = presetName;
    this.available = available;
    this.suggestion = suggestion;
  }
}
