# `nestjs-clean`

Clean Architecture inside per-feature NestJS modules. Nest stays the framework (presentation + DI), but the **domain is kept pure** — no `@nestjs/*`.

```yaml
presets: [nestjs-clean]
```

## Expected structure

```
src/modules/<feature>/
  domain/           # entities, value objects — NO @nestjs/* imports
  application/      # *.use-case.ts (@Injectable, execute()) + ports
  infrastructure/   # *.repository.ts (@Injectable, implements a port; TypeORM/Prisma)
  presentation/     # *.controller.ts (@Controller; calls use cases)
  <feature>.module.ts
```

## Layers & ruleset

`domain` → (nothing) · `application` → `domain`, `shared` · `infrastructure` → `domain`, `application`, `shared` · `presentation` → `domain`, `application`, `shared`.

## Key invariants

- Domain imports **no** framework/ORM and has no default/namespace exports.
- Use cases are `@Injectable` classes named `*UseCase` with `execute()`.
- Repositories implement a `*RepositoryPort`.
- Controllers are `@Controller` classes that don't `new` repositories or use cases (DI).
- Cross-module imports go through the module public API; no module/file/layer cycles.
