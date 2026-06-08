import { loadAndValidate } from '../../config/index.js';
import type { Theme } from '../../reporters/theme.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';
import { NO_COLOR_THEME } from '../style.js';

export interface ExplainOptions {
  rule?: string;
  config?: string;
}

export function runExplainCommand(
  opts: ExplainOptions,
  deps: CliDeps,
  theme: Theme = NO_COLOR_THEME,
): ExitCode {
  let config;
  try {
    ({ config } = loadAndValidate({
      cwd: deps.cwd,
      ...(opts.config !== undefined ? { explicitPath: opts.config } : {}),
    }));
  } catch (err) {
    return mapError(err, deps, theme);
  }

  if (opts.rule === undefined) {
    const names = [
      'layer-boundary',
      ...config.rules.map((r) => r.name),
      ...config.expectations.map((e) => e.name),
    ];
    const list = names.map((n) => `  ${theme.hint('-')} ${theme.cyan(n)}`).join('\n');
    deps.stdout.write(`${theme.heading('Available rules:')}\n${list}\n`);
    return ExitCode.Ok;
  }

  if (opts.rule === 'layer-boundary') {
    const lines = [`${theme.bold('layer-boundary')} — enforces ruleset.mayDependOn:`];
    for (const [layer, { mayDependOn }] of Object.entries(config.ruleset)) {
      lines.push(`  ${theme.cyan(layer)} may depend on: ${mayDependOn.join(', ') || theme.hint('(nothing)')}`);
    }
    deps.stdout.write(`${lines.join('\n')}\n`);
    return ExitCode.Ok;
  }

  const rule = config.rules.find((r) => r.name === opts.rule);
  if (rule) {
    deps.stdout.write(`${theme.bold(rule.name)} — graph rule of type "${rule.type}".\n`);
    return ExitCode.Ok;
  }

  const exp = config.expectations.find((e) => e.name === opts.rule);
  if (exp) {
    const clauses = exp.clauses.map((c) => c.kind).join(', ');
    deps.stdout.write(`${theme.bold(exp.name)} — expectation asserting: ${clauses}.\n`);
    return ExitCode.Ok;
  }

  deps.stderr.write(`${theme.err(`Unknown rule "${opts.rule}"`)}.\n`);
  return ExitCode.ConfigError;
}
