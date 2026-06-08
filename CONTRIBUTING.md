# Contributing to ArchContract

Thanks for your interest in improving ArchContract! This document covers everything you need to get productive.

## Code of Conduct

By participating you agree to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Prerequisites

- **Node.js** >= 22
- **pnpm** (via `corepack enable`)

## Getting started

```bash
git clone https://github.com/leofmarciano/arch-contract.git
cd arch-contract
pnpm install
pnpm -r test
```

The repository is a pnpm monorepo. The publishable package lives in
[`packages/arch-contract`](./packages/arch-contract).

## Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm -r test` | Run the Vitest suite |
| `pnpm --filter arch-contract test:watch` | Watch mode |
| `pnpm -r typecheck` | `tsc --noEmit` across the workspace |
| `pnpm -r build` | Build with tsup (ESM + types + bin) |
| `pnpm arch:check` | Run ArchContract on itself (dogfood) |

## Development workflow (TDD)

ArchContract is built test-first. When adding a feature or fixing a bug:

1. **Write a failing test** under `packages/arch-contract/tests/` mirroring the source path.
2. Implement the smallest change to make it pass.
3. Keep `pnpm -r typecheck` and `pnpm -r test` green.
4. Prefer **hermetic tests** — the parser tests use in-memory ts-morph fixtures
   (`tests/helpers/project.ts`), config/CLI tests use temp dirs (`tests/helpers/tmp.ts`).

### Architecture notes

- `src/core/types.ts` is the **single canonical home** for shared types
  (`Violation`, `Selector`, `Severity`, the index contracts). Never re-declare
  these elsewhere — import them.
- All paths stored in indices are **absolute POSIX**; `Violation.file` is
  **relative POSIX**. Every glob match goes through `project/path-utils.toPosix`.
- ts-morph is isolated behind `src/parser/` and `src/project/` so the engine
  could later swap to the raw TypeScript Compiler API.
- A `Violation` from a graph rule and from an AST expectation is the **same
  shape**, with the same readable `fingerprint` (`rule:file:target`), so the
  baseline works uniformly for both.

## Commit & PR guidelines

- Keep PRs focused; one logical change per PR.
- Make sure `pnpm -r typecheck`, `pnpm -r test` and `pnpm -r build` pass.
- Add or update tests for any behavior change.
- Update the [CHANGELOG](./CHANGELOG.md) under "Unreleased".
- Describe the motivation and the user-visible effect in the PR body.

## Reporting bugs / requesting features

Use the GitHub issue templates. For security issues, follow
[SECURITY.md](./SECURITY.md) instead of opening a public issue.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](./LICENSE).
