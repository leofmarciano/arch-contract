import type { Theme } from '../../reporters/theme.js';
import {
  COMMANDS,
  GLOBAL_OPTIONS,
  commandUsage,
  type CommandMeta,
  type CommandOptionMeta,
} from './registry.js';

const INDENT = '  ';

/** Pad `name` to `width` columns, then color only the name (so escapes don't break alignment). */
function row(name: string, width: number, summary: string, color: (s: string) => string): string {
  const gap = ' '.repeat(Math.max(2, width - name.length + 2));
  return `${INDENT}${color(name)}${gap}${summary}`;
}

function optionRows(options: CommandOptionMeta[], width: number, theme: Theme): string[] {
  return options.map((o) => {
    const summary =
      o.default !== undefined ? `${o.summary} ${theme.hint(`(default: ${o.default})`)}` : o.summary;
    return row(o.flag, width, summary, theme.cyan);
  });
}

/** Width of the widest label across a set of strings (for column alignment). */
function colWidth(labels: string[]): number {
  return labels.reduce((max, l) => Math.max(max, l.length), 0);
}

/** Top-level help: tagline, usage, command list, global options. Replaces the old HELP constant. */
export function renderTopLevelHelp(theme: Theme): string {
  const cmdWidth = colWidth(COMMANDS.map((c) => c.name));
  const optWidth = colWidth(GLOBAL_OPTIONS.map((o) => o.flag));

  const lines: string[] = [
    `${theme.bold('arch-contract')} — architecture contract validator for TypeScript`,
    '',
    theme.heading('USAGE'),
    `${INDENT}arch-contract <command> [options]`,
    '',
    theme.heading('COMMANDS'),
    ...COMMANDS.map((c) => row(c.name, cmdWidth, c.summary, theme.cyan)),
    '',
    theme.heading('GLOBAL OPTIONS'),
    ...optionRows(GLOBAL_OPTIONS, optWidth, theme),
    '',
    theme.hint('Run `arch-contract <command> --help` for command-specific help.'),
  ];
  return `${lines.join('\n')}\n`;
}

/** Per-command help: header, usage, command + global options, examples. */
export function renderCommandHelp(cmd: CommandMeta, theme: Theme): string {
  const optWidth = colWidth([...cmd.options, ...GLOBAL_OPTIONS].map((o) => o.flag));

  const lines: string[] = [
    `${theme.bold(`arch-contract ${cmd.name}`)} — ${cmd.summary}`,
    '',
    theme.heading('USAGE'),
    `${INDENT}${commandUsage(cmd)}`,
  ];

  if (cmd.options.length > 0) {
    lines.push('', theme.heading('OPTIONS'), ...optionRows(cmd.options, optWidth, theme));
  }

  lines.push('', theme.heading('GLOBAL OPTIONS'), ...optionRows(GLOBAL_OPTIONS, optWidth, theme));

  if (cmd.examples && cmd.examples.length > 0) {
    lines.push(
      '',
      theme.heading('EXAMPLES'),
      ...cmd.examples.map((e) => `${INDENT}${theme.hint(e)}`),
    );
  }
  return `${lines.join('\n')}\n`;
}
