# `clean-architecture`

Robert C. Martin's Clean Architecture — four concentric layers with the **Dependency Rule**: source dependencies point only inward.

```yaml
presets: [clean-architecture]
```

## Expected structure

```
src/
  domain/          # entities, value-objects — framework-free, the innermost circle
    entities/        User.ts
    value-objects/
  application/     # use cases + ports (interfaces)
    use-cases/       CreateUserUseCase.ts  (class, execute(), `UseCase` suffix)
    ports/           UserRepositoryPort.ts (interface)
  infrastructure/  # adapters: repositories, ORM, external clients
    repositories/    UserRepository.ts     (implements *RepositoryPort)
  presentation/    # controllers / http
    controllers/     UserController.ts      (`Controller` suffix; uses use cases, not repos)
```

## Layers & dependency rule

| Layer | may depend on |
| --- | --- |
| `domain` | — (nothing) |
| `application` | `domain` |
| `infrastructure` | `domain`, `application` |
| `presentation` | `domain`, `application` |

Crucially `application` may **not** import `infrastructure`/`presentation` — boundaries are crossed via Dependency Inversion (`*RepositoryPort` interfaces in `application`, implemented in `infrastructure`).

## Key invariants

- `domain` imports no frameworks/ORMs/HTTP clients and has no default/namespace exports.
- Use cases are classes named `*UseCase` exposing `execute()`.
- Repository ports are interfaces; concrete repositories `implement` a `*RepositoryPort`.
- Entities are classes and are **not** used by the presentation layer (return DTOs instead).
- Controllers don't `new` a `*Repository`.
- No file/layer cycles.

## Customizing

Re-declare any rule/expectation under the same `name` to override it, or set your own `layers[].match` globs (e.g. retarget `domain`). Your config always wins.
