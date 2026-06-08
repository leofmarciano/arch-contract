import { syncArchitectureGuide } from '../../agents/update-agent-docs.js';
import { loadAndValidate } from '../../config/index.js';
import type { Theme } from '../../reporters/theme.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';
import { NO_COLOR_THEME } from '../style.js';

export interface SyncAgentRulesOptions {
  config?: string;
  check?: boolean;
  onlyExisting?: boolean;
}

/** Color the per-file state token without changing its text. */
function colorState(state: 'drift' | 'updated' | 'ok', theme: Theme): string {
  if (state === 'drift') return theme.warn(state);
  if (state === 'updated') return theme.cyan(state);
  return theme.ok(state);
}

export function runSyncAgentRulesCommand(
  opts: SyncAgentRulesOptions,
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

  const { results, drift } = syncArchitectureGuide(config.rootDir, config, {
    ...(opts.check !== undefined ? { check: opts.check } : {}),
    ...(opts.onlyExisting !== undefined ? { onlyExisting: opts.onlyExisting } : {}),
  });

  if (results.length === 0) {
    deps.stdout.write(`${theme.hint('No agent docs to write.')}\n`);
    return ExitCode.Ok;
  }
  for (const r of results) {
    const state = r.changed ? (opts.check === true ? 'drift' : 'updated') : 'ok';
    deps.stdout.write(`${colorState(state, theme)}: ${theme.hint(r.path)}\n`);
  }

  if (opts.check === true && drift) {
    deps.stderr.write(
      `${theme.warn('Agent rules docs are out of date.')} Run ${theme.cyan('arch-contract sync-agent-rules')}.\n`,
    );
    return ExitCode.Violations;
  }
  return ExitCode.Ok;
}
