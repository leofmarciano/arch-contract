import fs from 'node:fs';
import path from 'node:path';

import { UnknownPresetError } from '../../config/errors.js';
import { looksExternal } from '../../config/presets.js';
import { presetNames } from '../../config/presets/index.js';
import type { Theme } from '../../reporters/theme.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { NO_COLOR_THEME } from '../style.js';

export const DEFAULT_CONFIG_YAML = `version: 1

project:
  name: my-service
  packageManager: pnpm

paths:
  include:
    - src
  exclude:
    - "**/*.test.ts"
    - "**/*.spec.ts"

layers:
  - name: domain
    match:
      - src/**/domain/**/*.ts
  - name: application
    match:
      - src/**/application/**/*.ts
      - src/**/use-cases/**/*.ts
  - name: infrastructure
    match:
      - src/**/infrastructure/**/*.ts

ruleset:
  application:
    mayDependOn:
      - domain
  domain:
    mayDependOn: []
  infrastructure:
    mayDependOn:
      - application
      - domain

expectations:
  - name: domain-must-not-use-frameworks
    expect:
      layer: domain
    to:
      notDependOnPackages:
        - express
        - fastify
        - "@nestjs/*"
    severity: error

agent:
  enabled: true
  validationCommand: pnpm arch:check
  updateDocs:
    - AGENTS.md
    - CLAUDE.md
  instructions:
    - Run pnpm arch:check after every completed task.
    - Fix architectural violations in code before finishing.
`;

export interface InitOptions {
  force?: boolean;
  path?: string;
  preset?: string;
}

/** A minimal config that activates a preset; layers/ruleset/expectations come from it. */
function presetConfigYaml(preset: string, projectName: string): string {
  return `version: 1

project:
  name: ${projectName}

# Architecture comes from the "${preset}" preset. Your config is merged on top —
# add layers/ruleset/expectations here to extend or override it.
presets:
  - ${preset}
`;
}

export function runInitCommand(
  opts: InitOptions,
  deps: CliDeps,
  theme: Theme = NO_COLOR_THEME,
): ExitCode {
  let body = DEFAULT_CONFIG_YAML;
  let externalNote: string | undefined;
  if (opts.preset !== undefined) {
    const available = presetNames();
    const isBuiltin = available.includes(opts.preset);
    if (!isBuiltin && !looksExternal(opts.preset)) {
      // bare unknown name → almost certainly a typo of a built-in
      deps.stderr.write(`${theme.err(new UnknownPresetError(opts.preset, available).message)}\n`);
      return ExitCode.ConfigError;
    }
    body = presetConfigYaml(opts.preset, path.basename(deps.cwd) || 'my-service');
    if (!isBuiltin) {
      // external/path preset: scaffold it without requiring it to be installed yet
      externalNote =
        `${theme.warn(`Note: "${opts.preset}" is an external preset`)} — install it before checking:\n` +
        `  ${theme.cyan(`npm i -D ${opts.preset}`)}\n` +
        `${theme.hint('Only install presets you trust; preset packages run code when loaded.')}\n`;
    }
  }

  const target = path.resolve(deps.cwd, opts.path ?? 'arch-contract.yaml');
  if (fs.existsSync(target) && opts.force !== true) {
    deps.stderr.write(
      `${theme.warn(`Refusing to overwrite existing ${target}`)}. ${theme.hint('Use --force.')}\n`,
    );
    return ExitCode.Ok;
  }
  try {
    fs.writeFileSync(target, body, 'utf8');
  } catch (err) {
    deps.stderr.write(`${theme.err(`Could not write ${target}`)}: ${(err as Error).message}\n`);
    return ExitCode.ConfigError;
  }
  const ok = theme.enabled ? `${theme.symbolOk()} ` : '';
  deps.stdout.write(
    `${ok}Created ${theme.hint(target)}. Run ${theme.cyan('arch-contract check')} to validate your architecture.\n`,
  );
  if (externalNote !== undefined) deps.stdout.write(externalNote);
  return ExitCode.Ok;
}
