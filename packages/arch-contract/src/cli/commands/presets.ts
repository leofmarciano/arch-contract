import { UnknownPresetError } from '../../config/errors.js';
import { PRESETS, presetNames } from '../../config/presets/index.js';
import { validateConfig } from '../../config/validate-config.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';

export interface PresetsOptions {
  name?: string;
}

export function runPresetsCommand(opts: PresetsOptions, deps: CliDeps): ExitCode {
  const names = presetNames();

  if (opts.name === undefined) {
    deps.stdout.write('Available presets:\n\n');
    for (const name of names) {
      const meta = PRESETS[name]?.meta;
      if (meta) deps.stdout.write(`  ${name.padEnd(20)}${meta.oneLine}\n`);
    }
    deps.stdout.write(
      '\nUse one with:  arch-contract init --preset <name>   (or `presets: [<name>]` in your config)\n',
    );
    return ExitCode.Ok;
  }

  const entry = PRESETS[opts.name];
  if (!entry) {
    deps.stderr.write(`${new UnknownPresetError(opts.name, names).message}\n`);
    return ExitCode.ConfigError;
  }

  try {
    const { config } = validateConfig({
      raw: { version: 1, project: { name: 'preset-preview' }, presets: [opts.name] },
      configPath: '/preset/arch-contract.yaml',
      text: '',
    });
    deps.stdout.write(`${opts.name} — ${entry.meta.oneLine}\n\n`);
    deps.stdout.write('Layers:\n');
    for (const l of config.layers) deps.stdout.write(`  ${l.name.padEnd(22)}${l.match.join(', ')}\n`);
    deps.stdout.write('\nRuleset (mayDependOn):\n');
    for (const [layer, e] of Object.entries(config.ruleset)) {
      deps.stdout.write(`  ${layer.padEnd(22)}${e.mayDependOn.join(', ') || '(nothing)'}\n`);
    }
    if (config.rules.length > 0) {
      deps.stdout.write(`\nRules: ${config.rules.map((r) => r.name).join(', ')}\n`);
    }
    if (config.expectations.length > 0) {
      deps.stdout.write(`\nExpectations: ${config.expectations.map((e) => e.name).join(', ')}\n`);
    }
    return ExitCode.Ok;
  } catch (err) {
    return mapError(err, deps);
  }
}
