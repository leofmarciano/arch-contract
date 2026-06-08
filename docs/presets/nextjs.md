# `nextjs`

Next.js App Router. `app/**` is presentation (Next is opinionated about routing); the business core is Clean Architecture in `src/` (Next is unopinionated about it).

```yaml
presets: [nextjs]
```

## Expected structure

```
src/
  app/                      # PRESENTATION + ROUTING
    **/page.tsx, layout.tsx # pages
    **/route.ts             # Route Handlers — call use cases
    **/_actions/*.ts        # Server Actions
    **/_components/*.tsx     # route-local UI
  components/               # shared UI
  domain/                   # entities, value objects — framework-free
  application/              # use cases
  infrastructure/ | server/ # adapters (DB/Prisma/HTTP)
  lib/ | utils/ | types/    # shared
```

## Layers & ruleset

`domain` → (nothing) · `application` → `domain`, `shared` · presentation (`presentation-routing`, `route-handler`, `server-action`, `presentation-components`) → application/domain/shared · `infrastructure` → domain/application/shared.

## Key invariants

- `domain` imports no `next`/`react`/ORM and has no default/namespace exports; `application` is framework-free too.
- **Route handlers and server actions never import the ORM or `infrastructure/` directly** — they go through use cases.
- UI components don't import the ORM/infrastructure.
- No file cycles.

> ts-morph can't see `'use client'`/`'use server'` semantics beyond imports — keep server-only code out of client components by convention.
