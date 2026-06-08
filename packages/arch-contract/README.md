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

## Presets

Activate a built-in, strict architecture preset instead of writing rules from scratch:

```yaml
version: 1
project: { name: my-service }
presets: [clean-architecture]   # merged UNDER your config — you always win
```

```bash
arch-contract presets                  # list all 10
arch-contract presets nestjs-clean     # show a preset's layers + rules
arch-contract init --preset hexagonal  # scaffold a config using it
```

Built-in presets: `clean-architecture`, `hexagonal`, `node-service`, `nestjs-clean`, `nest-js`, `nextjs`, `tanstack-starter`, `adonisjs`, `elysiajs`, `encore-ts`. Opinionated frameworks follow their own conventions; unopinionated ones get Clean Architecture. Your config merges on top (override layers/rules/expectations by `name`; `ruleset` replaces per layer). See the [preset docs](https://github.com/leofmarciano/arch-contract/tree/main/docs/presets).

> ⭐ **`encore-ts` — AAA Quality.** Our most battle-tested preset: service-per-directory boundaries (`encore.service.ts`), cross-service calls only through `~encore/clients`, thin `api()` handlers, and infrastructure declared in its owning service. Validated against real Encore.ts scaffolds. See [encore-ts.md](https://github.com/leofmarciano/arch-contract/blob/main/docs/presets/encore-ts.md).

### External presets

Reference a published package or a local file the same way you reference a built-in:

```yaml
presets:
  - clean-architecture            # built-in (base)
  - arch-contract-preset-acme     # npm package (npm i -D arch-contract-preset-acme)
  - "@acme/arch-contract-preset-x" # scoped package
  - ./arch/team-overrides.cjs     # local file, no publish needed
```

A name is treated as external when it is a scoped package (`@…`), a path (`./…`, `/…`),
or contains `arch-contract-preset`; anything else stays a built-in (a bare typo still
gets a "did you mean" hint). External presets resolve from your project's
`node_modules` (relative to the config file). They run code when loaded — **only install
presets you trust**. To author one, see [docs/presets/authoring.md](https://github.com/leofmarciano/arch-contract/blob/main/docs/presets/authoring.md).

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
