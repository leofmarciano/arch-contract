# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Architecture presets** — 10 built-in, strict presets activated with
  `presets: [<name>]`: `clean-architecture`, `hexagonal`, `node-service`,
  `nestjs-clean`, `nest-js`, `nextjs`, `tanstack-starter`, `adonisjs`,
  `elysiajs`, `encore-ts`. A preset is a partial config merged **under** yours
  (you always win: override by `name`, `ruleset` replaces per layer).
- **CLI** — `arch-contract presets [name]` lists/shows presets; `init --preset
  <name>` scaffolds a config that uses one; unknown presets fail with a
  "did you mean" hint (exit 2).
- **Engine** — `notHave: ['namespaceExport']` / star-export detection is now
  implemented (was previously a silent no-op).

## [0.1.1] - 2026-06-08

### Added

- **CI release automation** — publishing to npmjs (with npm provenance) and to
  GitHub Packages now runs automatically on every published GitHub release.

No functional changes to the library since 0.1.0; this is the first release cut
through the automated pipeline.

## [0.1.0] - 2026-06-08

### Added

- **Config** — YAML config discovery (`arch-contract.yaml`, `architecture.yaml`,
  `.arch-contract.yaml`, `arch-contract.config.yaml`) with parent-directory walk-up, a
  full zod schema, normalization and semantic (cross-reference) validation.
- **Project analysis** — tsconfig & path-alias resolution, file discovery, and a
  ts-morph-based parser producing File/Import/Symbol/Usage indices (barrel-aware
  usage attribution).
- **Dependency-graph rules** — `layer-boundary` (from `ruleset`),
  `forbidden-import`, `allowed-dependency`, `no-cycles` (Tarjan SCC),
  `public-api-boundary`.
- **AST expectations** (Pest-Arch style) — `be`, `extend`, `implement`,
  `haveMethod`, `haveDecorator`, `notHaveDecorator`, `notCall`, `notInstantiate`,
  `haveSuffix`, `notHave`, `export`, `onlyBeUsedIn`, `notBeUsedIn`,
  `notDependOnPackages`, `notDependOnPaths`, each with `ignoring` and `severity`.
- **Reporters** — `table`, `json`, `markdown`, `github` (annotations); a SARIF
  renderer is provided standalone (post-MVP).
- **Baseline** — record current violations and fail CI only on new ones
  (`baseline`, `check --use-baseline` / `--no-baseline`).
- **CLI** — `check`, `init`, `validate-config`, `baseline`, `graph`, `explain`,
  `sync-agent-docs`, `agent-instructions` with stable exit codes (`0/1/2`).
- **AI agent contract** — a controlled, idempotent instruction block synced into
  `AGENTS.md`, `CLAUDE.md` and other configured docs.

[Unreleased]: https://github.com/leofmarciano/arch-contract/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/leofmarciano/arch-contract/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/leofmarciano/arch-contract/releases/tag/v0.1.0
