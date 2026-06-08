<div align="center">

# ArchContract

**Architecture contract validator for TypeScript projects.**
Enforce layers, dependency boundaries, AST expectations and AI-agent instructions in CI/CD — *without acting as a linter*.

[![CI](https://github.com/leofmarciano/arch-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/leofmarciano/arch-contract/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/arch-contract.svg)](https://www.npmjs.com/package/arch-contract)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-green.svg)](https://nodejs.org)

</div>

---

ArchContract combines the best of **[Deptrac](https://github.com/qossmic/deptrac)** (YAML layers, rulesets, CI enforcement) and **[Pest Arch](https://pestphp.com/docs/arch-testing)** (semantic expectations that look *inside* the code — classes, `extends`, `implements`, `onlyBeUsedIn`, naming, `ignoring`) — built **TypeScript-native** on real AST analysis.

It is **not** a linter/formatter and does not compete with Biome, ESLint or Prettier. It is a structural and architectural contract that fails your CI when the code drifts from the architecture you declared.

```txt
ArchContract is an architecture contract validator for TypeScript projects.
It enforces structural boundaries, code expectations and agent instructions
in CI/CD without acting as a linter.
```

## Why

- **Architecture-first / CI-first** — your architecture is a contract, validated on every PR.
- **Two levels of analysis** — a dependency graph (layers, imports, cycles, module boundaries) *and* inside-the-file AST checks (classes, heritage, methods, decorators, calls, instantiations, usage).
- **AI-agent-readable** — emits JSON for agents and keeps a controlled instruction block in `AGENTS.md` / `CLAUDE.md` so coding agents run the check after every task.
- **Incrementally adoptable** — a baseline lets legacy projects accept today's violations and fail only on *new* ones.

## Install

Published on npm as **`arch-contract`**; the CLI command is `arch-contract`.

```bash
pnpm add -D arch-contract      # or: npm i -D arch-contract / bun add -d arch-contract
```

## Quick start

```bash
npx arch-contract init         # scaffold arch-contract.yaml
npx arch-contract check        # validate — exit code 1 on violations
```

After installing, the `arch-contract` command is on your PATH:

```bash
arch-contract check
```

```yaml
# arch-contract.yaml
version: 1
project: { name: my-service }

layers:
  - { name: domain,         match: [src/**/domain/**/*.ts] }
  - { name: application,    match: [src/**/application/**/*.ts] }
  - { name: infrastructure, match: [src/**/infrastructure/**/*.ts] }

ruleset:
  application:    { mayDependOn: [domain] }
  domain:         { mayDependOn: [] }
  infrastructure: { mayDependOn: [domain, application] }

expectations:
  - name: use-cases-must-have-execute
    expect: { path: src/**/use-cases/**/*.ts }
    to: { be: [class], haveSuffix: [UseCase], haveMethod: [execute] }

  - name: domain-must-not-use-frameworks
    expect: { layer: domain }
    to: { notDependOnPackages: [express, fastify, "@nestjs/*"] }
```

## Commands

| Command | Purpose |
| --- | --- |
| `arch-contract check` | Validate the contract (`--format table\|json\|markdown\|github`, `--use-baseline`) |
| `arch-contract init` | Scaffold an `arch-contract.yaml` |
| `arch-contract validate-config` | Validate the config without analyzing the project |
| `arch-contract baseline` | Record current violations as an accepted baseline |
| `arch-contract graph` | Print the layer dependency graph (mermaid) |
| `arch-contract explain [rule]` | Explain a rule or expectation |
| `arch-contract sync-agent-docs` | Insert/update the agent contract block in docs (`--check` for CI) |
| `arch-contract agent-instructions` | Print the raw agent instructions |

Exit codes: `0` ok · `1` violations / runtime error · `2` config error.

## Documentation

Full configuration reference, the complete `to:` vocabulary and the programmatic API live in the package README: **[packages/arch-contract/README.md](./packages/arch-contract/README.md)**.

## CI (GitHub Actions)

```yaml
name: Architecture
on: { pull_request: {}, push: { branches: [main] } }
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

## Project status

`v0.1.0` — MVP. Layers, dependency rules, cycles, AST expectations, usage index, reporters, baseline and agent docs are implemented and tested. See the [CHANGELOG](./CHANGELOG.md) and the [roadmap](#roadmap).

### Roadmap

- Presets (`clean-architecture`, `hexagonal`, `node-service`, `nestjs-clean`, …)
- `graph --format mermaid|graphviz` views and a richer `explain`
- SARIF / JUnit reporters
- Plugin API for custom rules
- First-class Bun / Deno runtimes

## Contributing

Contributions are welcome — see **[CONTRIBUTING.md](./CONTRIBUTING.md)** and the **[Code of Conduct](./CODE_OF_CONDUCT.md)**.

This is a pnpm monorepo:

```bash
pnpm install
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

## License

[MIT](./LICENSE) © Leonardo Marciano ([@leofmarciano](https://github.com/leofmarciano))
