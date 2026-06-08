import { loadAndValidate } from '../../config/index.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';

export interface ExplainOptions {
  rule?: string;
  config?: string;
}

export function runExplainCommand(opts: ExplainOptions, deps: CliDeps): ExitCode {
  let config;
  try {
    ({ config } = loadAndValidate({
      cwd: deps.cwd,
      ...(opts.config !== undefined ? { explicitPath: opts.config } : {}),
    }));
  } catch (err) {
    return mapError(err, deps);
  }

  if (opts.rule === undefined) {
    const names = [
      'layer-boundary',
      ...config.rules.map((r) => r.name),
      ...config.expectations.map((e) => e.name),
    ];
    deps.stdout.write(`Available rules:\n${names.map((n) => `  - ${n}`).join('\n')}\n`);
    return ExitCode.Ok;
  }

  if (opts.rule === 'layer-boundary') {
    const lines = ['layer-boundary — enforces ruleset.mayDependOn:'];
    for (const [layer, { mayDependOn }] of Object.entries(config.ruleset)) {
      lines.push(`  ${layer} may depend on: ${mayDependOn.join(', ') || '(nothing)'}`);
    }
    deps.stdout.write(`${lines.join('\n')}\n`);
    return ExitCode.Ok;
  }

  const rule = config.rules.find((r) => r.name === opts.rule);
  if (rule) {
    deps.stdout.write(`${rule.name} — graph rule of type "${rule.type}".\n`);
    return ExitCode.Ok;
  }

  const exp = config.expectations.find((e) => e.name === opts.rule);
  if (exp) {
    const clauses = exp.clauses.map((c) => c.kind).join(', ');
    deps.stdout.write(`${exp.name} — expectation asserting: ${clauses}.\n`);
    return ExitCode.Ok;
  }

  deps.stderr.write(`Unknown rule "${opts.rule}".\n`);
  return ExitCode.ConfigError;
}
