# Architecture presets

Presets are built-in, strict (severity `error`), senior-grade rule bundles you activate by name:

```yaml
# arch-contract.yaml
version: 1
project: { name: my-service }
presets: [clean-architecture]
```

```bash
arch-contract presets               # list
arch-contract presets <name>        # show a preset's layers + rules
arch-contract init --preset <name>  # scaffold a config that uses it
```

## How merging works

A preset is a **partial config** merged **under** your config — **you always win**:

- **layers / rules / expectations** — concatenated, then anything you declare with the **same `name`** replaces the preset's.
- **ruleset** — replaced **per layer** (your `infrastructure.mayDependOn` replaces the preset's, it is not unioned).
- **paths.include** — replaced; **paths.exclude** — concatenated.
- **version / project** — always yours; a preset never sets them.
- Multiple presets fold left-to-right (`presets: [a, b]` → `b` overrides `a`), then your config on top.

So you can adopt a preset and then tighten/loosen individual rules by re-declaring them under the same `name`, or retarget a layer's globs.

## External presets

Besides the 10 built-ins you can activate a **published package** or a **local file**
by name — `presets: [arch-contract-preset-acme]`, `["@acme/arch-contract-preset-x"]`, or
`[./arch/house-rules.cjs]`. They resolve from your project's `node_modules` (relative to
the config) and run code on load, so install only presets you trust. To author and publish
one, see [authoring.md](./authoring.md).

## The 10 presets

| Preset | Based on | Doc |
| --- | --- | --- |
| `clean-architecture` | Clean Architecture | [clean-architecture.md](./clean-architecture.md) |
| `hexagonal` | Ports & Adapters | [hexagonal.md](./hexagonal.md) |
| `node-service` | Clean Architecture | [node-service.md](./node-service.md) |
| `nestjs-clean` | Clean Architecture | [nestjs-clean.md](./nestjs-clean.md) |
| `nest-js` | NestJS official | [nest-js.md](./nest-js.md) |
| `nextjs` | Next.js + Clean Arch | [nextjs.md](./nextjs.md) |
| `tanstack-starter` | TanStack Start + Clean Arch | [tanstack-starter.md](./tanstack-starter.md) |
| `adonisjs` | AdonisJS 6 official | [adonisjs.md](./adonisjs.md) |
| `elysiajs` | Clean Architecture | [elysiajs.md](./elysiajs.md) |
| `encore-ts` | Encore.ts official | [encore-ts.md](./encore-ts.md) |

**Design rule:** opinionated frameworks (NestJS, AdonisJS, Encore.ts) follow the framework's own recommended structure; unopinionated ones (ElysiaJS, TanStack Start, Next.js) get Clean Architecture for the business core while respecting the framework's routing conventions in the presentation layer.

## Static-analysis caveats

ArchContract is static (ts-morph). It reads imports, classes, heritage, decorators, methods, call/`new` expressions — it cannot see runtime wiring (DI containers, `'use client'` semantics beyond imports) or distinguish type-only from value imports. Name-based checks (`*Repository`, `@Injectable`) rely on conventions; rename-resistant rules use layers/paths. Whole-file checks (`be`, `haveSuffix`) apply to **every exported declaration** in a file, so presets target narrow globs and `ignoring` barrels — keep one public declaration per file for the cleanest results.
