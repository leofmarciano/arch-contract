import fs from 'node:fs';
import path from 'node:path';

import { UnknownPresetError } from '../../config/errors.js';
import { presetNames } from '../../config/presets/index.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';

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

export function runInitCommand(opts: InitOptions, deps: CliDeps): ExitCode {
  let body = DEFAULT_CONFIG_YAML;
  if (opts.preset !== undefined) {
    const available = presetNames();
    if (!available.includes(opts.preset)) {
      deps.stderr.write(`${new UnknownPresetError(opts.preset, available).message}\n`);
      return ExitCode.ConfigError;
    }
    body = presetConfigYaml(opts.preset, path.basename(deps.cwd) || 'my-service');
  }

  const target = path.resolve(deps.cwd, opts.path ?? 'arch-contract.yaml');
  if (fs.existsSync(target) && opts.force !== true) {
    deps.stderr.write(`Refusing to overwrite existing ${target}. Use --force.\n`);
    return ExitCode.Ok;
  }
  try {
    fs.writeFileSync(target, body, 'utf8');
  } catch (err) {
    deps.stderr.write(`Could not write ${target}: ${(err as Error).message}\n`);
    return ExitCode.ConfigError;
  }
  deps.stdout.write(`Created ${target}. Run \`arch-contract check\` to validate your architecture.\n`);
  return ExitCode.Ok;
}
