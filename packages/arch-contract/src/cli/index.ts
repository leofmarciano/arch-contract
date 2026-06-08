import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { cac } from 'cac';

import { VERSION } from '../index.js';
import { runAgentInstructionsCommand } from './commands/agent-instructions.js';
import { runBaselineCommand } from './commands/baseline.js';
import { runCheckCommand } from './commands/check.js';
import { runExplainCommand } from './commands/explain.js';
import { runGraphCommand } from './commands/graph.js';
import { runInitCommand } from './commands/init.js';
import { runSyncAgentDocsCommand } from './commands/sync-agent-docs.js';
import { runValidateConfigCommand } from './commands/validate-config.js';
import { defaultDeps, type CliDeps } from './deps.js';
import { ExitCode } from './exit-codes.js';
import { mapError } from './map-error.js';

interface RawOptions {
  config?: string;
  format?: string;
  baseline?: boolean;
  useBaseline?: boolean;
  force?: boolean;
  path?: string;
  out?: string;
  reason?: string;
  check?: boolean;
}

function baselineFlag(o: RawOptions): boolean | undefined {
  if (o.baseline === false) return false;
  if (o.baseline === true || o.useBaseline === true) return true;
  return undefined;
}

const HELP = `arch-contract — architecture contract validator

Usage: arch-contract <command> [options]

Commands:
  check               Validate the architecture contract (exit 1 on violations)
  init                Scaffold an arch-contract.yaml
  validate-config     Validate the config without analyzing the project
  baseline            Record current violations as an accepted baseline
  graph               Print the layer dependency graph (mermaid)
  explain [rule]      Explain a rule or expectation
  sync-agent-docs     Insert/update the agent contract block in docs
  agent-instructions  Print the raw agent instructions

Common options:
  --config <path>     Path to the arch-contract config
  --format <format>   check: table|json|markdown|github
  --help, -h          Show help
  --version, -v       Show version
`;

/** Parse argv and run the matched command, returning an exit code. Never calls process.exit. */
export async function main(argv: string[], deps: CliDeps = defaultDeps()): Promise<ExitCode> {
  const rest = argv.slice(2);
  if (rest.length === 0 || rest[0] === '--help' || rest[0] === '-h') {
    deps.stdout.write(HELP);
    return ExitCode.Ok;
  }
  if (rest[0] === '--version' || rest[0] === '-v') {
    deps.stdout.write(`${VERSION}\n`);
    return ExitCode.Ok;
  }

  const cli = cac('arch-contract');
  let exit: ExitCode = ExitCode.Ok;
  const dispatch = (fn: () => ExitCode | Promise<ExitCode>): Promise<void> =>
    Promise.resolve(fn()).then((code) => {
      exit = code;
    });

  cli
    .command('check', 'Validate the architecture contract')
    .option('--config <path>', 'Config path')
    .option('--format <format>', 'table|json|markdown|github', { default: 'table' })
    .option('--baseline', 'Apply baseline suppression (use --no-baseline to disable)')
    .option('--use-baseline', 'Apply baseline suppression')
    .action((o: RawOptions) =>
      dispatch(() =>
        runCheckCommand(
          { config: o.config, format: o.format, baseline: baselineFlag(o) },
          deps,
        ),
      ),
    );

  cli
    .command('init', 'Scaffold an arch-contract.yaml')
    .option('--force', 'Overwrite an existing config')
    .option('--path <path>', 'Target path')
    .action((o: RawOptions) =>
      dispatch(() => runInitCommand({ force: o.force, path: o.path }, deps)),
    );

  cli
    .command('validate-config', 'Validate the config')
    .option('--config <path>', 'Config path')
    .action((o: RawOptions) => dispatch(() => runValidateConfigCommand({ config: o.config }, deps)));

  cli
    .command('baseline', 'Record an accepted baseline')
    .option('--config <path>', 'Config path')
    .option('--out <path>', 'Output baseline path')
    .option('--reason <text>', 'Reason recorded on each entry')
    .action((o: RawOptions) =>
      dispatch(() => runBaselineCommand({ config: o.config, out: o.out, reason: o.reason }, deps)),
    );

  cli
    .command('graph', 'Print the layer dependency graph')
    .option('--config <path>', 'Config path')
    .option('--format <format>', 'mermaid|stub', { default: 'mermaid' })
    .action((o: RawOptions) =>
      dispatch(() => runGraphCommand({ config: o.config, format: o.format }, deps)),
    );

  cli
    .command('explain [rule]', 'Explain a rule or expectation')
    .option('--config <path>', 'Config path')
    .action((rule: string | undefined, o: RawOptions) =>
      dispatch(() => runExplainCommand({ rule, config: o.config }, deps)),
    );

  cli
    .command('sync-agent-docs', 'Insert/update the agent contract block')
    .option('--config <path>', 'Config path')
    .option('--check', 'Report drift without writing')
    .action((o: RawOptions) =>
      dispatch(() => runSyncAgentDocsCommand({ config: o.config, check: o.check }, deps)),
    );

  cli
    .command('agent-instructions', 'Print the raw agent instructions')
    .option('--config <path>', 'Config path')
    .action((o: RawOptions) =>
      dispatch(() => runAgentInstructionsCommand({ config: o.config }, deps)),
    );

  let parsed;
  try {
    parsed = cli.parse(argv, { run: false });
  } catch (err) {
    deps.stderr.write(`${(err as Error).message}\n`);
    return ExitCode.ConfigError;
  }

  if (parsed.options['help'] === true) {
    deps.stdout.write(HELP);
    return ExitCode.Ok;
  }
  if (!cli.matchedCommand) {
    deps.stderr.write(`Unknown command: ${rest[0]}\n`);
    return ExitCode.ConfigError;
  }

  try {
    await cli.runMatchedCommand();
  } catch (err) {
    return mapError(err, deps);
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
