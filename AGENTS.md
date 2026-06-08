# Working in this repo (for AI agents)

ArchContract is a pnpm monorepo; the package lives in `packages/arch-contract`. Build
with `pnpm -r build`, test with `pnpm -r test`, typecheck with `pnpm -r typecheck`.
See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full development guide.

The block below is generated and kept up to date by `arch-contract sync-agent-docs` —
edit `arch-contract.yaml` (`agent.instructions`), not this block.

<!-- arch-contract-agent-contract:start -->

## Architecture Validation

After every implementation task, run:

```bash
pnpm arch:check
```

You must not finish a task while architecture violations are present.

Rules:
- Run `pnpm arch:check` after every completed task.
- Keep shared types in src/core/types.ts; never re-declare Violation/Selector elsewhere.
- Fix architectural violations in code before finishing; do not weaken rules to pass.
- Add a failing test first (TDD) for any behavior change.

<!-- arch-contract-agent-contract:end -->
