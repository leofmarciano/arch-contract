# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **CLI color theming** — human-facing CLI output (the `table` reporter, `presets`,
  help, errors) is now themed via a `Theme` abstraction (`src/reporters/theme.ts`),
  with a no-color fallback so machine formats (`json`/`github`) stay byte-stable.
- **External preset packages** — activate a published package or a local file the
  same way as a built-in: `presets: [arch-contract-preset-acme]`,
  `["@acme/arch-contract-preset-x"]`, or `[./arch/house-rules.cjs]`. A name is
  external when it is scoped (`@…`), a path (`./…`, `/…`), or contains
  `arch-contract-preset`; bare unknown names still get the "did you mean" hint.
  Externals resolve synchronously from the consumer's `node_modules` (relative to
  the config file) and merge with the same semantics as built-ins (you always win).
  Export a `PresetFragment` or a `{ meta, fragment }` entry; `presets <pkg>` and
  `init --preset <pkg>` support externals. New `PresetLoadError` /
  `InvalidPresetError`; new `presetFragmentSchema`. See
  [docs/presets/authoring.md](./docs/presets/authoring.md).

## [0.2.0] - 2026-06-08

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
- **Engine** — `appliesTo: { kind: [...] }` on an expectation scopes
  declaration-level clauses (`be`/`haveSuffix`/`extend`/`implement`/`haveMethod`/
  `haveDecorator`) to specific symbol kinds, so a co-located input/command DTO in
  a `*.use-case.ts` no longer trips a class-only rule.
- **Engine** — project analysis now auto-loads the project `tsconfig.json` and
  the `package.json` `imports` map (subpath `#`-aliases), so import-based rules
  resolve `@/*` and `#alias/*` edges instead of silently missing them.

### Fixed

- Validated every preset against real projects scaffolded with each framework's
  official CLI. Fixes for false positives on idiomatic/framework-generated code:
  `nest-js` (bootstrap layer, dropped `Entity` suffix), `nextjs` (DI
  `composition` layer + `@/*` alias resolution), `tanstack-starter`/`elysiajs`
  (server-fn/module composition roots may wire infrastructure), `encore-ts`
  (`encore.gen/**` excluded, `api` catch-all), and `adonisjs` (dedicated `env`
  leaf layer so framework config files may import `#start/env`).

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

[Unreleased]: https://github.com/leofmarciano/arch-contract/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/leofmarciano/arch-contract/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/leofmarciano/arch-contract/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/leofmarciano/arch-contract/releases/tag/v0.1.0
