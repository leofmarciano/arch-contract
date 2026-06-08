import { afterEach, describe, expect, it } from 'vitest';

import { buildArchitectureGuide, describeClause } from '../../src/agents/architecture-guide.js';
import { loadAndValidate } from '../../src/config/index.js';
import type { Clause } from '../../src/config/model.js';
import { makeTmpDir, rmDir, writeFile } from '../helpers/tmp.js';

const YAML = `version: 1
project:
  name: myapp
paths:
  include: src
layers:
  - name: domain
    match: src/domain/**/*.ts
  - name: application
    match: src/application/**/*.ts
  - name: infrastructure
    match: src/infrastructure/**/*.ts
  - name: presentation
    match: src/presentation/**/*.ts
ruleset:
  domain:
    mayDependOn: []
  application:
    mayDependOn: [domain]
  infrastructure:
    mayDependOn: [domain, application]
  presentation:
    mayDependOn: [domain, application]
rules:
  - name: no-cycles
    type: no-cycles
  - name: domain-stays-pure
    type: forbidden-import
    from: { layer: domain }
    to: { layer: infrastructure }
  - name: public-api-boundary
    type: public-api-boundary
expectations:
  - name: use-cases-shape
    expect: { path: src/application/**/*.ts }
    appliesTo: { kind: [class] }
    to:
      haveSuffix: UseCase
      haveMethod: execute
      notInstantiate: PrismaClient
  - name: named-exports-only
    expect: { path: src/**/*.ts }
    to:
      export: { mode: namedOnly }
modules:
  pattern: src/modules/*
  publicApi: index.ts
agent:
  enabled: true
  validationCommand: pnpm arch:check
`;

const dirs: string[] = [];
function fixtureConfig() {
  const d = makeTmpDir();
  dirs.push(d);
  writeFile(d, 'arch-contract.yaml', YAML);
  return loadAndValidate({ cwd: d }).config;
}
afterEach(() => {
  while (dirs.length) rmDir(dirs.pop() as string);
});

describe('buildArchitectureGuide', () => {
  it('renders the heading, source note and validation command', () => {
    const out = buildArchitectureGuide(fixtureConfig());
    expect(out).toContain('## Architecture Rules (myapp)');
    expect(out).toContain('arch-contract.yaml');
    expect(out).toContain('`pnpm arch:check` will fail on any violation');
  });

  it('renders layers with their match globs', () => {
    const out = buildArchitectureGuide(fixtureConfig());
    expect(out).toContain('### Layers — where code lives');
    expect(out).toContain('- **domain** — `src/domain/**/*.ts`');
    expect(out).toContain('- **presentation** — `src/presentation/**/*.ts`');
  });

  it('renders the dependency matrix from the ruleset', () => {
    const out = buildArchitectureGuide(fixtureConfig());
    expect(out).toContain('### Allowed dependencies');
    expect(out).toContain('- **domain** may not depend on any other layer.');
    expect(out).toContain('- **infrastructure** may depend on: `domain`, `application`.');
  });

  it('renders module boundaries', () => {
    const out = buildArchitectureGuide(fixtureConfig());
    expect(out).toContain('### Module boundaries');
    expect(out).toContain('Modules live at `src/modules/*`');
    expect(out).toContain('public API file `index.ts`');
  });

  it('renders import rules as sentences', () => {
    const out = buildArchitectureGuide(fixtureConfig());
    expect(out).toContain('### Import rules');
    expect(out).toContain('- **no-cycles**: No dependency cycles between files.');
    expect(out).toContain(
      '- **domain-stays-pure**: the `domain` layer must not import the `infrastructure` layer.',
    );
    expect(out).toContain(
      '- **public-api-boundary**: a module may only be imported through its public API (except within the same module).',
    );
  });

  it('renders expectation clauses as sentences', () => {
    const out = buildArchitectureGuide(fixtureConfig());
    expect(out).toContain('### Naming & code conventions');
    expect(out).toContain('- **use-cases-shape** — files matching `src/application/**/*.ts`, applies to: class:');
    expect(out).toContain('  - name must end with: `UseCase`');
    expect(out).toContain('  - must declare method(s): `execute`');
    expect(out).toContain('  - must not instantiate: `PrismaClient`');
    expect(out).toContain('  - must use named exports only (no default or namespace exports)');
  });

  it('renders the add-a-file checklist and closing reminder', () => {
    const out = buildArchitectureGuide(fixtureConfig());
    expect(out).toContain('### Adding a new file — checklist');
    expect(out).toContain('5. Use named exports (no default/namespace exports).');
    expect(out).toContain('### Before you finish');
    expect(out).toContain('Run `pnpm arch:check` and fix every violation in code.');
  });

  it('is deterministic across calls', () => {
    const cfg = fixtureConfig();
    expect(buildArchitectureGuide(cfg)).toBe(buildArchitectureGuide(cfg));
  });
});

describe('describeClause', () => {
  const cases: Array<[Clause, string]> = [
    [{ kind: 'be', values: ['class'] }, 'must be a `class`'],
    [{ kind: 'extend', values: ['Base'] }, 'must extend one of: `Base`'],
    [{ kind: 'implement', values: ['Port'] }, 'must implement: `Port`'],
    [{ kind: 'haveMethod', values: ['execute'] }, 'must declare method(s): `execute`'],
    [{ kind: 'haveDecorator', values: ['@Injectable'] }, 'must be decorated with: `@Injectable`'],
    [{ kind: 'notHaveDecorator', values: ['@Entity'] }, 'must not be decorated with: `@Entity`'],
    [{ kind: 'notCall', values: ['console.log'] }, 'must not call: `console.log`'],
    [{ kind: 'notInstantiate', values: ['PrismaClient'] }, 'must not instantiate: `PrismaClient`'],
    [{ kind: 'haveSuffix', values: ['Controller'] }, 'name must end with: `Controller`'],
    [{ kind: 'notHave', values: ['defaultExport', 'namespaceExport'] }, 'must not use: default exports, namespace exports'],
    [{ kind: 'export', mode: 'namedOnly' }, 'must use named exports only (no default or namespace exports)'],
    [{ kind: 'onlyBeUsedIn', values: ['src/presentation/**'] }, 'may only be imported from: `src/presentation/**`'],
    [{ kind: 'notBeUsedIn', values: ['src/app/**'] }, 'must not be imported from: `src/app/**`'],
    [{ kind: 'notDependOnPackages', values: ['ts-morph'] }, 'must not depend on npm packages: `ts-morph`'],
    [{ kind: 'notDependOnPaths', values: ['src/legacy/**'] }, 'must not depend on paths: `src/legacy/**`'],
  ];

  it.each(cases)('renders %o', (clause, expected) => {
    expect(describeClause(clause)).toBe(expected);
  });
});
