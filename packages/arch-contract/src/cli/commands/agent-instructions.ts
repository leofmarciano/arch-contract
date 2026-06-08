import { buildInstructions } from '../../agents/instruction-block.js';
import { loadAndValidate } from '../../config/index.js';
import type { Theme } from '../../reporters/theme.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';
import { NO_COLOR_THEME } from '../style.js';

export interface AgentInstructionsOptions {
  config?: string;
}

export function runAgentInstructionsCommand(
  opts: AgentInstructionsOptions,
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
  // Raw block is copied verbatim into AGENTS.md/CLAUDE.md — keep it un-themed.
  deps.stdout.write(`${buildInstructions(config.agent)}\n`);
  return ExitCode.Ok;
}
