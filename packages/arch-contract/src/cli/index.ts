import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { cac, type CAC } from 'cac';

import { closestMatch } from '../config/errors.js';
import { VERSION } from '../index.js';
import { runAgentInstructionsCommand } from './commands/agent-instructions.js';
import { runBaselineCommand } from './commands/baseline.js';
import { runCheckCommand } from './commands/check.js';
import { runExplainCommand } from './commands/explain.js';
import { runGraphCommand } from './commands/graph.js';
import { runInitCommand } from './commands/init.js';
import { runPresetsCommand } from './commands/presets.js';
import { runSyncAgentDocsCommand } from './commands/sync-agent-docs.js';
import { runSyncAgentRulesCommand } from './commands/sync-agent-rules.js';
import { runValidateConfigCommand } from './commands/validate-config.js';
import { defaultDeps, type CliDeps } from './deps.js';
import { ExitCode } from './exit-codes.js';
import { COMMANDS, findCommand, type CommandMeta } from './help/registry.js';
import { renderCommandHelp, renderTopLevelHelp } from './help/render-help.js';
import { createTheme } from './style.js';
import type { Theme } from '../reporters/theme.js';

interface RawOptions {
  config?: string;
  format?: string;
  baseline?: boolean;
  useBaseline?: boolean;
  force?: boolean;
  path?: string;
  preset?: string;
  out?: string;
  reason?: string;
  check?: boolean;
  onlyExisting?: boolean;
}

function baselineFlag(o: RawOptions): boolean | undefined {
  if (o.baseline === false) return false;
  if (o.baseline === true || o.useBaseline === true) return true;
  return undefined;
}

/** Wires each command's parsed (positional, options) to its runner + theme. */
type ActionContext = { positional?: string; options: RawOptions };
const ACTIONS: Record<
  string,
  (deps: CliDeps, theme: Theme, ctx: ActionContext) => ExitCode | Promise<ExitCode>
> = {
  check: (deps, theme, { options: o }) =>
    runCheckCommand({ config: o.config, format: o.format, baseline: baselineFlag(o) }, deps, theme),
  init: (deps, theme, { options: o }) =>
    runInitCommand({ force: o.force, path: o.path, preset: o.preset }, deps, theme),
  presets: (deps, theme, { positional }) => runPresetsCommand({ name: positional }, deps, theme),
  'validate-config': (deps, theme, { options: o }) =>
    runValidateConfigCommand({ config: o.config }, deps, theme),
  baseline: (deps, theme, { options: o }) =>
    runBaselineCommand({ config: o.config, out: o.out, reason: o.reason }, deps, theme),
  graph: (deps, theme, { options: o }) =>
    runGraphCommand({ config: o.config, format: o.format }, deps, theme),
  explain: (deps, theme, { positional, options: o }) =>
    runExplainCommand({ rule: positional, config: o.config }, deps, theme),
  'sync-agent-docs': (deps, theme, { options: o }) =>
    runSyncAgentDocsCommand({ config: o.config, check: o.check }, deps, theme),
  'sync-agent-rules': (deps, theme, { options: o }) =>
    runSyncAgentRulesCommand(
      { config: o.config, check: o.check, onlyExisting: o.onlyExisting },
      deps,
      theme,
    ),
  'agent-instructions': (deps, theme, { options: o }) =>
    runAgentInstructionsCommand({ config: o.config }, deps, theme),
};

/** Register every command from the registry, attaching its runner via ACTIONS. */
function registerCommands(cli: CAC, deps: CliDeps, theme: Theme, setExit: (c: ExitCode) => void): void {
  for (const cmd of COMMANDS) {
    const command = cli.command(cmd.args ? `${cmd.name} ${cmd.args}` : cmd.name, cmd.summary);
    for (const opt of cmd.options) {
      command.option(opt.flag, opt.summary, opt.default !== undefined ? { default: opt.default } : {});
    }
    command.action((...cacArgs: unknown[]) => {
      const options = (cacArgs.at(-1) ?? {}) as RawOptions;
      const ctx: ActionContext = cmd.args
        ? { positional: cacArgs[0] as string | undefined, options }
        : { options };
      return Promise.resolve(ACTIONS[cmd.name]?.(deps, theme, ctx) ?? ExitCode.Ok).then(setExit);
    });
  }
}

/** Effective color: explicit flags win, else the base decision carried on deps. */
function resolveColor(rest: string[], base: boolean): boolean {
  if (rest.includes('--no-color')) return false;
  if (rest.includes('--color')) return true;
  return base;
}

const HELP_TOKENS = new Set(['--help', '-h']);

/** Parse argv and run the matched command, returning an exit code. Never calls process.exit. */
export async function main(argv: string[], deps: CliDeps = defaultDeps()): Promise<ExitCode> {
  const rest = argv.slice(2);
  const theme = createTheme(resolveColor(rest, deps.color));

  // Top-level help / version, before any command parsing.
  if (rest.length === 0 || rest[0] === '--help' || rest[0] === '-h') {
    deps.stdout.write(renderTopLevelHelp(theme));
    return ExitCode.Ok;
  }
  if (rest[0] === '--version' || rest[0] === '-v') {
    deps.stdout.write(`${VERSION}\n`);
    return ExitCode.Ok;
  }

  // `<command> --help`: route to that command's help and never run it.
  const cmdMeta: CommandMeta | undefined = findCommand(rest[0] as string);
  if (cmdMeta && rest.slice(1).some((t) => HELP_TOKENS.has(t))) {
    deps.stdout.write(renderCommandHelp(cmdMeta, theme));
    return ExitCode.Ok;
  }

  const cli = cac('arch-contract');
  cli.option('--color', 'Force color output (use --no-color to disable)');
  let exit: ExitCode = ExitCode.Ok;
  registerCommands(cli, deps, theme, (c) => {
    exit = c;
  });

  try {
    cli.parse(argv, { run: false });
  } catch (err) {
    deps.stderr.write(`${theme.err((err as Error).message)}\n`);
    return ExitCode.ConfigError;
  }

  if (!cli.matchedCommand) {
    const name = rest[0] as string;
    const guess = closestMatch(name, COMMANDS.map((c) => c.name));
    const didYouMean = guess !== undefined ? ` Did you mean ${theme.cyan(guess)}?` : '';
    const header = theme.err(`Unknown command: ${name}`);
    const hint = theme.hint('Run `arch-contract --help` to see available commands.');
    deps.stderr.write(`${header}.${didYouMean}\n${hint}\n`);
    return ExitCode.ConfigError;
  }

  try {
    await cli.runMatchedCommand();
  } catch (err) {
    deps.stderr.write(`${theme.err('arch-contract')}: ${(err as Error).message}\n`);
    return ExitCode.Violations;
  }
  return exit;
}

function isDirectRun(): boolean {
  try {
    const entry = process.argv[1];
    return entry !== undefined && fileURLToPath(import.meta.url) === fs.realpathSync(entry);
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  void main(process.argv).then((code) => {
    process.exitCode = code;
  });
}
