import { syncAgentDocs } from '../../agents/update-agent-docs.js';
import { loadAndValidate } from '../../config/index.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';

export interface SyncAgentDocsOptions {
  config?: string;
  check?: boolean;
}

export function runSyncAgentDocsCommand(opts: SyncAgentDocsOptions, deps: CliDeps): ExitCode {
  let config;
  try {
    ({ config } = loadAndValidate({
      cwd: deps.cwd,
      ...(opts.config !== undefined ? { explicitPath: opts.config } : {}),
    }));
  } catch (err) {
    return mapError(err, deps);
  }

  const { results, drift } = syncAgentDocs(config.rootDir, config.agent, {
    ...(opts.check !== undefined ? { check: opts.check } : {}),
  });

  if (results.length === 0) {
    deps.stdout.write('No agent docs configured (set agent.updateDocs).\n');
    return ExitCode.Ok;
  }
  for (const r of results) {
    const state = r.changed ? (opts.check === true ? 'drift' : 'updated') : 'ok';
    deps.stdout.write(`${state}: ${r.path}\n`);
  }

  if (opts.check === true && drift) {
    deps.stderr.write('Agent docs are out of date. Run `arch-contract sync-agent-docs`.\n');
    return ExitCode.Violations;
  }
  return ExitCode.Ok;
}
