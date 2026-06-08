import { UnknownPresetError } from '../../config/errors.js';
import { looksExternal } from '../../config/presets.js';
import { PRESETS, presetNames } from '../../config/presets/index.js';
import { resolveExternalPreset } from '../../config/presets/resolve-external.js';
import { validateConfig } from '../../config/validate-config.js';
import type { Theme } from '../../reporters/theme.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';
import { NO_COLOR_THEME } from '../style.js';

export interface PresetsOptions {
  name?: string;
}

function asList(v: string | string[] | undefined): string {
  if (v === undefined) return '';
  return Array.isArray(v) ? v.join(', ') : v;
}

/** Cut `s` to fit `max` columns, adding an ellipsis when truncated. */
function truncate(s: string, max: number): string {
  if (max < 1 || s.length <= max) return s;
  return `${s.slice(0, Math.max(1, max - 1))}…`;
}

/** Pad `name` to `width`, coloring only the name so escapes don't break alignment. */
function labelCol(name: string, width: number, color: (s: string) => string): string {
  return `${color(name)}${' '.repeat(Math.max(2, width - name.length + 2))}`;
}

/** A `Layers:` / `Ruleset:` section: aligned `name  value` rows under a heading. */
function section(
  heading: string,
  rows: Array<[name: string, value: string]>,
  theme: Theme,
): string[] {
  const width = rows.reduce((m, [name]) => Math.max(m, name.length), 0);
  return [
    theme.heading(heading),
    ...rows.map(([name, value]) => `  ${labelCol(name, width, theme.cyan)}${value}`),
  ];
}

function listPresets(deps: CliDeps, theme: Theme): ExitCode {
  const names = presetNames();
  const nameWidth = names.reduce((m, n) => Math.max(m, n.length), 0);
  const descWidth = Math.max(24, deps.width - nameWidth - 4);

  const lines: string[] = [theme.heading('Available presets'), ''];
  for (const name of names) {
    const meta = PRESETS[name]?.meta;
    if (!meta) continue;
    lines.push(
      `  ${labelCol(name, nameWidth, theme.cyan)}${theme.hint(truncate(meta.oneLine, descWidth))}`,
    );
  }
  lines.push(
    '',
    theme.heading('Use a preset'),
    `  ${theme.cyan('arch-contract init --preset <name>')}  ${theme.hint('scaffold a fresh config')}`,
    `  ${theme.cyan('presets: [<name>]')}                   ${theme.hint('add to an existing config')}`,
    '',
    theme.hint('Run `arch-contract presets <name>` to inspect one.'),
    theme.hint(
      'External presets: reference an installed package, e.g. `presets: [arch-contract-preset-acme]`.',
    ),
    theme.hint('They run code on load — only install presets you trust.'),
  );
  deps.stdout.write(`${lines.join('\n')}\n`);
  return ExitCode.Ok;
}

function showPreset(name: string, deps: CliDeps, theme: Theme): ExitCode {
  const builtin = PRESETS[name];
  if (!builtin && !looksExternal(name)) {
    deps.stderr.write(`${theme.err(new UnknownPresetError(name, presetNames()).message)}\n`);
    return ExitCode.ConfigError;
  }

  try {
    if (builtin) {
      // Built-in: preview the fully-normalized config (merged base + fragment).
      const { config } = validateConfig({
        raw: { version: 1, project: { name: 'preset-preview' }, presets: [name] },
        configPath: '/preset/arch-contract.yaml',
        text: '',
      });
      const lines: string[] = [
        `${theme.bold(name)} ${theme.hint(`— based on ${builtin.meta.basedOn}`)}`,
        theme.hint(builtin.meta.oneLine),
        '',
        ...section(
          'Layers:',
          config.layers.map((l) => [l.name, theme.hint(l.match.join(', '))]),
          theme,
        ),
        '',
        ...section(
          'Ruleset (mayDependOn):',
          Object.entries(config.ruleset).map(([layer, e]) => [
            layer,
            e.mayDependOn.join(', ') || theme.hint('(nothing)'),
          ]),
          theme,
        ),
      ];
      if (config.rules.length > 0) {
        lines.push('', `${theme.heading('Rules:')} ${config.rules.map((r) => r.name).join(', ')}`);
      }
      if (config.expectations.length > 0) {
        lines.push(
          '',
          `${theme.heading('Expectations:')} ${config.expectations.map((e) => e.name).join(', ')}`,
        );
      }
      deps.stdout.write(`${lines.join('\n')}\n`);
      return ExitCode.Ok;
    }

    // External: render the resolved fragment directly (resolves from cwd, and
    // works for rules-only presets that the full config schema would reject).
    const { meta, fragment } = resolveExternalPreset(name, deps.cwd);
    const header = meta
      ? `${theme.bold(name)} ${theme.hint(`(external preset · based on ${meta.basedOn}) — ${meta.oneLine}`)}`
      : `${theme.bold(name)} ${theme.hint('(external preset)')}`;
    const lines: string[] = [header, ''];
    if (fragment.layers && fragment.layers.length > 0) {
      lines.push(
        ...section(
          'Layers:',
          fragment.layers.map((l) => [l.name, theme.hint(asList(l.match))]),
          theme,
        ),
        '',
      );
    }
    if (fragment.ruleset && Object.keys(fragment.ruleset).length > 0) {
      lines.push(
        ...section(
          'Ruleset (mayDependOn):',
          Object.entries(fragment.ruleset).map(([layer, e]) => [
            layer,
            asList(e.mayDependOn) || theme.hint('(nothing)'),
          ]),
          theme,
        ),
        '',
      );
    }
    if (fragment.rules && fragment.rules.length > 0) {
      lines.push(`${theme.heading('Rules:')} ${fragment.rules.map((r) => r.name).join(', ')}`);
    }
    if (fragment.expectations && fragment.expectations.length > 0) {
      lines.push(
        `${theme.heading('Expectations:')} ${fragment.expectations.map((e) => e.name).join(', ')}`,
      );
    }
    deps.stdout.write(`${lines.join('\n').replace(/\n+$/, '')}\n`);
    return ExitCode.Ok;
  } catch (err) {
    return mapError(err, deps, theme);
  }
}

export function runPresetsCommand(
  opts: PresetsOptions,
  deps: CliDeps,
  theme: Theme = NO_COLOR_THEME,
): ExitCode {
  return opts.name === undefined ? listPresets(deps, theme) : showPreset(opts.name, deps, theme);
}
