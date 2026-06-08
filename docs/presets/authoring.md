# Authoring an external preset

Anyone can publish a preset as an npm package (or keep one as a local file) and
activate it exactly like a built-in. This is the same mechanism the 10 built-in
presets use — a preset is just a **partial, schema-valid config fragment** merged
**under** the user's config.

## How a consumer uses it

```yaml
# arch-contract.yaml
version: 1
project: { name: my-app }
presets:
  - arch-contract-preset-acme      # your published package
  - "@acme/arch-contract-preset-x" # or scoped
  - ./arch/house-rules.cjs         # or a local file (no publish needed)
```

```bash
npm i -D arch-contract-preset-acme
arch-contract presets arch-contract-preset-acme   # preview its layers/rules
arch-contract check
```

A name resolves as **external** when it is scoped (`@…`), a path (`./…`, `/…`), or
contains `arch-contract-preset`. Resolution happens from the **consumer's project**
(`node_modules` near their config file), so your package must be installed there.

## The export contract

The module's default export (or `module.exports`) is **either** a bare fragment
**or** a `{ meta?, fragment }` entry. Only these six fragment sections are allowed
(the schema is strict — no `version`, `project`, `description`, or other keys):
`paths`, `layers`, `ruleset`, `rules`, `expectations`, `modules`. Every section is
optional, and `layers` may be empty (a rules-only preset is valid).

```js
// arch-contract-preset-acme/index.js  (CommonJS)
/** @type {import('arch-contract').PresetEntry} */
module.exports = {
  meta: {
    name: 'arch-contract-preset-acme',
    basedOn: 'clean-architecture',
    oneLine: 'Acme conventions: ports in domain, vendor SDKs never in the core',
  },
  fragment: {
    layers: [
      { name: 'domain', match: ['src/domain/**'] },
      { name: 'adapters', match: ['src/adapters/**'] },
    ],
    ruleset: {
      domain: { mayDependOn: [] },
      adapters: { mayDependOn: ['domain'] },
    },
    expectations: [
      {
        name: 'domain-has-no-vendor-sdk',
        expect: { layer: 'domain' },
        to: { notDependOnPackages: ['stripe', 'aws-sdk', '@acme/http'] },
        severity: 'error',
      },
    ],
  },
};
```

`meta` is optional — without it the fragment itself is the export:

```js
module.exports = { layers: [/* … */], ruleset: { /* … */ } };
```

TypeScript authors get types from `arch-contract` and build to CommonJS:

```ts
// src/index.ts  → tsup --format cjs
import type { PresetEntry } from 'arch-contract';
const preset: PresetEntry = { meta: { /* … */ }, fragment: { /* … */ } };
export default preset;
```

## Packaging

```json
{
  "name": "arch-contract-preset-acme",
  "version": "1.0.0",
  "type": "commonjs",
  "main": "index.js",
  "peerDependencies": { "arch-contract": ">=0.3.0" }
}
```

- **Name it `arch-contract-preset-<x>`** (or scope it) so users can reference it
  directly and discovery is obvious.
- **Ship CommonJS** (or a dual package). arch-contract loads presets
  **synchronously** via `require`, so a pure-ESM package that uses **top-level
  await** cannot be loaded — you'll get a `PresetLoadError` telling you to publish
  CommonJS or drop the top-level await.
- Keep `arch-contract` a **peer dependency**, not a hard dependency.

## How it merges (you always win)

A preset is merged **under** the consumer's config; multiple presets fold
left-to-right, then the user's config on top:

- **layers / rules / expectations** — concatenated; same `name` replaces.
- **ruleset** — replaced **per layer** (not unioned).
- **paths.include** — replaced; **paths.exclude** — concatenated.
- **Built-in names are reserved** — a package named `clean-architecture` can never
  shadow the built-in.

## Errors you may see

| Error | Cause |
| --- | --- |
| `PresetLoadError: MODULE_NOT_FOUND` | the package/path isn't installed/found near the config |
| `PresetLoadError: … ESM module with top-level await` | publish CommonJS or remove top-level await |
| `InvalidPresetError: exported an invalid fragment` | the fragment failed the preset schema (e.g. a layer missing `match`, or a stray key) |

## Security

Loading a preset **executes its code** (like ESLint/Prettier plugins). Only install
presets you trust.
