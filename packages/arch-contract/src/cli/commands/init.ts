import fs from 'node:fs';
import path from 'node:path';

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
}

export function runInitCommand(opts: InitOptions, deps: CliDeps): ExitCode {
  const target = path.resolve(deps.cwd, opts.path ?? 'arch-contract.yaml');
  if (fs.existsSync(target) && opts.force !== true) {
    deps.stderr.write(`Refusing to overwrite existing ${target}. Use --force.\n`);
    return ExitCode.Ok;
  }
  try {
    fs.writeFileSync(target, DEFAULT_CONFIG_YAML, 'utf8');
  } catch (err) {
    deps.stderr.write(`Could not write ${target}: ${(err as Error).message}\n`);
    return ExitCode.ConfigError;
  }
  deps.stdout.write(`Created ${target}. Run \`arch-contract check\` to validate your architecture.\n`);
  return ExitCode.Ok;
}
