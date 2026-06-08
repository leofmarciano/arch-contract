# `hexagonal`

Alistair Cockburn's Hexagonal / Ports & Adapters: a domain core, an application ring of ports + use cases, and symmetric **primary (driving)** and **secondary (driven)** adapters.

```yaml
presets: [hexagonal]
```

## Expected structure

```
src/
  domain/                       # core domain model — framework-free
  application/
    ports/                      # interfaces (the "ports")
    use-cases/                  # CreateUserUseCase.ts (class, execute())
  adapters/
    in/  (or primary/)          # driving: http/cli/graphql controllers
    out/ (or secondary/)        # driven: db repositories, external clients
```

## Layers & ruleset

| Layer | may depend on |
| --- | --- |
| `domain` | — |
| `application` | `domain` |
| `adapters-primary` | `application`, `domain` |
| `adapters-secondary` | `application`, `domain` |

## Key invariants

- Primary and secondary adapters **must not import each other**.
- Ports are interfaces; driven adapters `implement` a `*Port`/`*RepositoryPort`.
- `domain` is framework-free with no default/namespace exports.
- Use cases are classes with `execute()`.
- No file/layer cycles.

Both `in`/`primary` and `out`/`secondary` directory namings are recognized.
