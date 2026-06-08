# arch-contract (ArchContract)

> Architecture contract validator for TypeScript projects. Enforces layers, dependency boundaries, AST expectations and agent instructions in CI/CD — **without acting as a linter**.

ArchContract combines the best of **Deptrac** (YAML layers, rulesets, CI enforcement) and **Pest Arch** (semantic expectations that look *inside* the code: classes, `extends`, `implements`, `onlyBeUsedIn`, naming, `ignoring`), analysing real TypeScript AST.

> Published on npm as **`arch-contract`**; the CLI command is **`arch-contract`**.

## Install

```bash
pnpm add -D arch-contract
```

## Quick start

```bash
npx arch-contract init      # scaffold arch-contract.yaml
npx arch-contract check     # validate (exit code 1 on violations)
# after install, the `arch-contract` command is also available
```

## Config (`arch-contract.yaml`)

arch-contract looks for `arch-contract.yaml`, `architecture.yaml`, `.arch-contract.yaml`, or `arch-contract.config.yaml` (walking up parent dirs).

```yaml
version: 1
project:
  name: my-service

layers:
  - name: domain
    match: [src/**/domain/**/*.ts]
  - name: application
    match: [src/**/application/**/*.ts]
  - name: infrastructure
    match: [src/**/infrastructure/**/*.ts]

ruleset:
  application: { mayDependOn: [domain] }
  domain: { mayDependOn: [] }
  infrastructure: { mayDependOn: [domain, application] }

expectations:
  - name: use-cases-must-have-execute
    expect: { path: src/**/use-cases/**/*.ts }
    to:
      be: [class]
      haveSuffix: [UseCase]
      haveMethod: [execute]

  - name: domain-must-not-use-frameworks
    expect: { layer: domain }
    to:
      notDependOnPackages: [express, fastify, "@nestjs/*"]
```

### Two levels of analysis

- **Dependency graph** — `layer-boundary` (from `ruleset`), `forbidden-import`, `allowed-dependency`, `no-cycles`, `public-api-boundary`.
- **AST expectations** — `be`, `extend`, `implement`, `haveMethod`, `haveDecorator`, `notHaveDecorator`, `notCall`, `notInstantiate`, `haveSuffix`, `notHave`, `export`, `onlyBeUsedIn`, `notBeUsedIn`, `notDependOnPackages`, `notDependOnPaths` — each with `ignoring` and `severity`.

## CLI

```bash
arch-contract check [--config <path>] [--format table|json|markdown|github] [--use-baseline|--no-baseline]
arch-contract init [--force]
arch-contract validate-config
arch-contract baseline [--out <path>] [--reason <text>]
arch-contract graph                 # mermaid layer graph
arch-contract explain [rule]
arch-contract sync-agent-docs [--check]
arch-contract agent-instructions
```

Exit codes: `0` ok · `1` violations / runtime error · `2` config error.

## Baseline (legacy adoption)

```bash
arch-contract baseline              # records current violations
arch-contract check --use-baseline  # old violations ignored, NEW ones fail CI
```

## Recommended package scripts

```json
{
  "scripts": {
    "arch:check": "arch-contract check --config arch-contract.yaml",
    "arch:check:json": "arch-contract check --config arch-contract.yaml --format json",
    "arch:baseline": "arch-contract baseline --config arch-contract.yaml",
    "arch:docs": "arch-contract sync-agent-docs --config arch-contract.yaml"
  }
}
```

## CI (GitHub Actions)

```yaml
name: Architecture
on:
  pull_request:
  push:
    branches: [main]
jobs:
  architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm arch:check --format github
```

## AI agent contract

`arch-contract sync-agent-docs` inserts/updates a controlled block (delimited by
`<!-- arch-contract-agent-contract:start --> … :end -->`) in `AGENTS.md`, `CLAUDE.md`
and any other files listed under `agent.updateDocs`, so coding agents are told to
run `arch-contract check` after every task. `--check` reports drift without writing.

## Programmatic API

```ts
import { runCheck, getReporter } from 'arch-contract';

const { result } = runCheck({ cwd: process.cwd() });
console.log(getReporter('json').render(result));
```

## License

MIT
