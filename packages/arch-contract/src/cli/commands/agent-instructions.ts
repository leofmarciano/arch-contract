import { buildInstructions } from '../../agents/instruction-block.js';
import { loadAndValidate } from '../../config/index.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';

export interface AgentInstructionsOptions {
  config?: string;
}

export function runAgentInstructionsCommand(
  opts: AgentInstructionsOptions,
  deps: CliDeps,
): ExitCode {
  let config;
  try {
    ({ config } = loadAndValidate({
      cwd: deps.cwd,
      ...(opts.config !== undefined ? { explicitPath: opts.config } : {}),
    }));
  } catch (err) {
    return mapError(err, deps);
  }
  deps.stdout.write(`${buildInstructions(config.agent)}\n`);
  return ExitCode.Ok;
}
