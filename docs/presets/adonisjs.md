# `adonisjs`

The **official** AdonisJS 6 convention layout (app/-rooted, not `src/`). Follows the framework's own structure — thin controllers, Lucid models, VineJS validators, Bouncer policies.

```yaml
presets: [adonisjs]
```

## Expected structure

```
app/
  controllers/   *_controller.ts   # classes, `Controller` suffix — thin
  models/        *.ts              # extend BaseModel
  services/      *.ts              # business logic
  middleware/    *.ts              # classes with handle(), `Middleware` suffix
  validators/    *.ts              # VineJS (named exports, no default)
  policies/      *.ts              # extend BasePolicy, `Policy` suffix
  exceptions/    *_exception.ts    # extend Exception
start/  routes.ts kernel.ts        # routing/registration only
config/  database/{migrations,seeders}/
```

## Dependency flow

`routes` → `controllers` → `services` → `models`. `config` is a leaf.

## Key invariants

- Controllers are classes (`Controller` suffix), don't query Lucid models directly and don't `new` a `*Model` (delegate to services).
- Models extend `BaseModel` and carry no HTTP concerns.
- Middleware are classes with `handle()`; policies extend `BasePolicy`; custom exceptions extend `Exception`.
- Validators are isolated (no imports of controllers/services/models/policies).
- No file cycles.

Single-action controllers / fat-model styles may need overrides.
