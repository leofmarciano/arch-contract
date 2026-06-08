export interface ConfigIssue {
  /** dotted path into the config, e.g. `expectations.0.to` */
  path: string;
  message: string;
}

/** No config file could be located by discovery. */
export class ConfigNotFoundError extends Error {
  readonly searched: string[];
  constructor(searched: string[]) {
    super(ConfigNotFoundError.buildMessage(searched));
    this.name = 'ConfigNotFoundError';
    this.searched = searched;
  }

  /** Condensed: the candidate filenames + where + count, not one line per probed path. */
  private static buildMessage(searched: string[]): string {
    const filenames = [...new Set(searched.map((s) => s.replace(/^.*\//, '')))];
    const startDir = searched[0]?.replace(/\/[^/]*$/, '') || '.';
    const names = filenames.length > 0 ? filenames.join(', ') : 'arch-contract.yaml';
    return (
      `No arch-contract config found.\n` +
      `Looked for ${names} in ${startDir} and its parent directories (${searched.length} path(s)).\n` +
      'Run `arch-contract init` to create one.'
    );
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

function looksLikePath(name: string): boolean {
  return name.startsWith('.') || name.startsWith('/');
}

export interface PresetLoadErrorOptions {
  /** Node error code, e.g. MODULE_NOT_FOUND / ERR_REQUIRE_ESM / ERR_REQUIRE_ASYNC_MODULE. */
  code?: string;
  cause?: unknown;
}

/**
 * An external preset (a package or a path) was classified as external but could
 * not be loaded: not installed, not require-able (pure-ESM / top-level await), or
 * it threw while evaluating. Distinct from {@link UnknownPresetError}, which is a
 * bare typo of a built-in.
 */
export class PresetLoadError extends Error {
  readonly presetName: string;
  readonly baseDir: string;
  readonly code: string | undefined;
  constructor(presetName: string, baseDir: string, opts: PresetLoadErrorOptions = {}) {
    super(PresetLoadError.buildMessage(presetName, baseDir, opts.code, opts.cause));
    this.name = 'PresetLoadError';
    this.presetName = presetName;
    this.baseDir = baseDir;
    this.code = opts.code;
  }

  private static buildMessage(
    name: string,
    baseDir: string,
    code: string | undefined,
    cause: unknown,
  ): string {
    const head = `Could not load preset "${name}" (resolved from ${baseDir})`;
    if (code === 'MODULE_NOT_FOUND') {
      const hint = looksLikePath(name)
        ? 'check the file path'
        : `install it first, e.g. \`npm i -D ${name}\``;
      return `${head}: MODULE_NOT_FOUND — ${hint}.`;
    }
    if (code === 'ERR_REQUIRE_ESM' || code === 'ERR_REQUIRE_ASYNC_MODULE') {
      return `${head}: it is an ESM module with top-level await. arch-contract loads presets synchronously — publish it as CommonJS (or remove the top-level await).`;
    }
    const detail = cause instanceof Error ? `: ${cause.message}` : '';
    return `${head}${detail}`;
  }
}

/** An external preset loaded but its exported fragment failed the preset-fragment schema. */
export class InvalidPresetError extends Error {
  readonly presetName: string;
  readonly issues: ConfigIssue[];
  constructor(presetName: string, issues: ConfigIssue[]) {
    super(
      `Preset "${presetName}" exported an invalid fragment (${issues.length} issue(s)):\n${formatIssues(issues)}`,
    );
    this.name = 'InvalidPresetError';
    this.presetName = presetName;
    this.issues = issues;
  }
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
