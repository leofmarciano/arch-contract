# `encore-ts`

The **official** Encore.ts conventions. A service is a directory containing `encore.service.ts` (the public boundary); endpoints use `api()` from `encore.dev/api`; cross-service calls go through the generated `~encore/clients`. Encore is root-rooted (not `src/`).

```yaml
presets: [encore-ts]
```

## Expected structure

```
<service>/                  # a service = directory with encore.service.ts
  encore.service.ts         # export default new Service("...")
  api.ts | *.api.ts         # api() endpoints (named exports, thin)
  db.ts | topics.ts | ...   # infrastructure: SQLDatabase, Topic, secrets, cron
  *.domain.ts | *.service.ts | *.repository.ts   # business/domain logic
  migrations/
shared/ | lib/ | common/    # framework-primitive-free
```

## Layers & ruleset

`api` → domain/infrastructure/shared/service-definition · `domain` → infrastructure/shared · `infrastructure` → shared · `shared` → (nothing).

## Key invariants

- **No deep cross-service imports** — reach other services only through `~encore/clients` (public-api boundary); no cross-service cycles.
- `api` files have no default export and stay thin: no inline `new SQLDatabase()`/repositories.
- Infrastructure files declare resources, not endpoints (no `api()` calls, no default export).
- Domain declares no endpoints and pulls in no foreign web frameworks; `shared` imports no `encore.dev` primitives.
- No `process.exit` (Encore manages the lifecycle).

Services nested under "system" folders (e.g. `trello/board`) may need a custom `modules.pattern`.
