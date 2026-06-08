# `nest-js`

The **official** NestJS layout (`nest g resource`, by-feature). Not Clean Architecture — Nest is opinionated, so this follows the framework's own conventions.

```yaml
presets: [nest-js]
```

## Expected structure

```
src/
  main.ts  app.module.ts
  <feature>/
    <feature>.module.ts       # @Module
    <feature>.controller.ts   # @Controller, thin — calls services
    <feature>.service.ts      # @Injectable — business logic
    dto/        *.dto.ts       # classes
    entities/   *.entity.ts
  common/  (guards/ pipes/ filters/ interceptors/ decorators/)
  config/
```

## Key invariants

- Controllers are `@Controller` classes (`Controller` suffix), are **not** `@Injectable`, and never `new` a service/repository (DI).
- Controllers delegate to **services**, never importing a `*.repository.ts` directly.
- Services are `@Injectable` classes; modules are `@Module` classes; DTOs are classes.
- Guards/pipes/filters/interceptors are `@Injectable`.
- **Feature modules are boundaries**: a feature may only import another feature through its `*.module.ts` (plus shared `common/`/`config/`). No cross-feature deep imports; no module cycles.

GraphQL projects (`*.resolver.ts`, `*.input.ts`) and global/dynamic modules may need a per-path override.
