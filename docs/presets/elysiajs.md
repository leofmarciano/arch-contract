# `elysiajs`

ElysiaJS (Bun): "one instance = one controller" presentation per feature module over a Clean Architecture core. Elysia is unopinionated about business logic, so the domain stays framework-free.

```yaml
presets: [elysiajs]
```

## Expected structure

```
src/
  index.ts                       # bootstrap: composes the Elysia app
  modules/<feature>/
    index.ts                     # the Elysia controller (presentation, public API)
    model.ts                     # Elysia.t DTOs
    application/  *.use-case.ts   # use cases + ports
    domain/       *.entity.ts     # framework-free
    infrastructure/ *.repository.ts
  http/                          # shared plugins (cors, swagger, error handler)
  shared/                        # framework-free utils
```

## Layers & ruleset

`domain` → (nothing) · `application` → `domain`, `shared` · `presentation` → `application`, `domain`, `shared` · `infrastructure` → domain/application/shared · `main` → everything.

## Key invariants

- `domain` imports no `elysia`/frameworks and has no default/namespace exports; `application` doesn't import `elysia`.
- Use cases are classes with `execute()`; repositories implement a port.
- Cross-module imports go through the module's `index.ts` public API.
- No file/layer cycles.
