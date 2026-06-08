/**
 * Single source of truth for the CLI's commands. Drives BOTH the `cac`
 * command/option registration in `index.ts` AND the rendered help (top-level
 * and per-command). Adding a command here wires it into help automatically.
 */

export interface CommandOptionMeta {
  /** Exact cac option string, e.g. `--format <format>`. */
  flag: string;
  summary: string;
  /** cac default, surfaced in help. */
  default?: string;
}

export interface CommandMeta {
  name: string;
  /** Optional positional spec for cac + usage, e.g. `[name]` / `[rule]`. */
  args?: string;
  /** One line, shown in the top-level command list and as the command header. */
  summary: string;
  options: CommandOptionMeta[];
  examples?: string[];
}

const CONFIG_OPTION: CommandOptionMeta = {
  flag: '--config <path>',
  summary: 'Path to the arch-contract config',
};

export const COMMANDS: CommandMeta[] = [
  {
    name: 'check',
    summary: 'Validate the architecture contract (exit 1 on violations)',
    options: [
      CONFIG_OPTION,
      { flag: '--format <format>', summary: 'table | json | markdown | github', default: 'table' },
      { flag: '--baseline', summary: 'Apply baseline suppression (use --no-baseline to disable)' },
      { flag: '--use-baseline', summary: 'Apply baseline suppression' },
    ],
    examples: [
      'arch-contract check',
      'arch-contract check --format json',
      'arch-contract check --no-baseline',
    ],
  },
  {
    name: 'init',
    summary: 'Scaffold an arch-contract.yaml',
    options: [
      { flag: '--force', summary: 'Overwrite an existing config' },
      { flag: '--path <path>', summary: 'Where to write the config' },
      { flag: '--preset <name>', summary: 'Scaffold a config that uses a built-in preset' },
    ],
    examples: ['arch-contract init', 'arch-contract init --preset clean-architecture'],
  },
  {
    name: 'presets',
    args: '[name]',
    summary: 'List built-in architecture presets (or show one)',
    options: [],
    examples: ['arch-contract presets', 'arch-contract presets hexagonal'],
  },
  {
    name: 'validate-config',
    summary: 'Validate the config without analyzing the project',
    options: [CONFIG_OPTION],
    examples: ['arch-contract validate-config'],
  },
  {
    name: 'baseline',
    summary: 'Record current violations as an accepted baseline',
    options: [
      CONFIG_OPTION,
      { flag: '--out <path>', summary: 'Output baseline path' },
      { flag: '--reason <text>', summary: 'Reason recorded on each entry' },
    ],
    examples: ['arch-contract baseline', 'arch-contract baseline --reason "legacy debt"'],
  },
  {
    name: 'graph',
    summary: 'Print the layer dependency graph',
    options: [
      CONFIG_OPTION,
      { flag: '--format <format>', summary: 'mermaid | stub', default: 'mermaid' },
    ],
    examples: ['arch-contract graph', 'arch-contract graph --format stub'],
  },
  {
    name: 'explain',
    args: '[rule]',
    summary: 'Explain a rule or expectation (lists all when omitted)',
    options: [CONFIG_OPTION],
    examples: ['arch-contract explain', 'arch-contract explain layer-boundary'],
  },
  {
    name: 'sync-agent-docs',
    summary: 'Insert/update the agent contract block in docs',
    options: [CONFIG_OPTION, { flag: '--check', summary: 'Report drift without writing' }],
    examples: ['arch-contract sync-agent-docs', 'arch-contract sync-agent-docs --check'],
  },
  {
    name: 'sync-agent-rules',
    summary: 'Generate/update an architecture-rules guide in agent docs',
    options: [
      CONFIG_OPTION,
      { flag: '--check', summary: 'Report drift without writing' },
      { flag: '--only-existing', summary: 'Only update docs that already exist (never create)' },
    ],
    examples: [
      'arch-contract sync-agent-rules',
      'arch-contract sync-agent-rules --check',
      'arch-contract sync-agent-rules --only-existing',
    ],
  },
  {
    name: 'agent-instructions',
    summary: 'Print the raw agent instructions',
    options: [CONFIG_OPTION],
    examples: ['arch-contract agent-instructions'],
  },
];

/** Global options shown in the top-level help and on every command. */
export const GLOBAL_OPTIONS: CommandOptionMeta[] = [
  { flag: '--color', summary: 'Force color output' },
  { flag: '--no-color', summary: 'Disable color output' },
  { flag: '-h, --help', summary: 'Show help' },
  { flag: '-v, --version', summary: 'Show version' },
];

export function findCommand(name: string): CommandMeta | undefined {
  return COMMANDS.find((c) => c.name === name);
}

/** `arch-contract <name>[ <args>] [options]` */
export function commandUsage(cmd: CommandMeta): string {
  const parts = ['arch-contract', cmd.name];
  if (cmd.args) parts.push(cmd.args);
  if (cmd.options.length > 0) parts.push('[options]');
  return parts.join(' ');
}
