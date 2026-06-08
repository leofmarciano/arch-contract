# `tanstack-starter`

TanStack Start: file-based routes + server functions are the presentation/server seam; the business core is Clean Architecture.

```yaml
presets: [tanstack-starter]
```

## Expected structure

```
src/
  routes/                 # file-based routing (createFileRoute) — presentation
  server/ | *.server.ts   # server functions (createServerFn)
  core/
    domain/               # entities, value objects — framework-free
    application/          # use cases
  infrastructure/         # adapters (DB/HTTP)
  lib/ | utils/ | types/  # shared
  components/             # UI
```

## Layers & ruleset

`domain` → (nothing) · `application` → `domain`, `shared` · `presentation-routes` → server-fn/application/domain/shared · `server-fn` → application/domain/shared · `infrastructure` → domain/application/shared.

## Key invariants

- `domain` imports no `@tanstack/*`/`react`/ORM and has no default/namespace exports; `application` is framework-free.
- **Routes and server functions never import the ORM or `infrastructure/` directly** — they call use cases.
- No file cycles.
