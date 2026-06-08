# `node-service`

Pragmatic Clean Architecture for a generic Node/TS service, with a framework-free `shared/` kernel and **optional** vertical slices under `src/modules/*`.

```yaml
presets: [node-service]
```

## Expected structure

```
src/
  domain/ | **/domain/          # entities, value objects — framework-free
  application/ | **/use-cases/  # use cases (class, execute(), `UseCase` suffix)
  infrastructure/ | **/repositories/  # adapters, repos
  presentation/ | **/controllers/ | routes/  # http
  shared/ | common/ | lib/      # framework-free leaf kernel
  modules/<feature>/            # optional vertical slices, each with index.ts public API
```

## Layers & ruleset

`domain` → (nothing) · `application` → `domain`, `shared` · `infrastructure` → `domain`, `application`, `shared` · `presentation` → `domain`, `application`, `shared` · `shared` → (nothing).

## Key invariants

- `domain` is framework-free; no default/namespace exports.
- Use cases are classes with `execute()`; repositories implement a port.
- Cross-module imports go through the module's `index.ts` (public-api boundary); no module cycles.
- No file/layer cycles.

If you don't use `src/modules/*`, the module rules simply never fire.
