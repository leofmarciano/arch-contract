import { ADONISJS } from './adonisjs.js';
import { CLEAN_ARCHITECTURE } from './clean-architecture.js';
import { ELYSIAJS } from './elysiajs.js';
import { ENCORE_TS } from './encore-ts.js';
import { HEXAGONAL } from './hexagonal.js';
import { NEST_JS } from './nest-js.js';
import { NESTJS_CLEAN } from './nestjs-clean.js';
import { NEXTJS } from './nextjs.js';
import { NODE_SERVICE } from './node-service.js';
import { TANSTACK_STARTER } from './tanstack-starter.js';
import type { PresetEntry } from './types.js';

/** The built-in preset registry. Single source of truth for resolution + the CLI. */
export const PRESETS: Record<string, PresetEntry> = {
  'clean-architecture': {
    meta: {
      name: 'clean-architecture',
      basedOn: 'clean-architecture',
      oneLine:
        'Uncle Bob 4-layer (domain/application/infrastructure/presentation) with the inward-only dependency rule, ports-as-interfaces and concrete-repos-implement-port.',
    },
    fragment: CLEAN_ARCHITECTURE,
  },
  hexagonal: {
    meta: {
      name: 'hexagonal',
      basedOn: 'hexagonal',
      oneLine:
        'Ports & Adapters: domain core + ports (interfaces) + symmetric primary/secondary adapters that must not import each other.',
    },
    fragment: HEXAGONAL,
  },
  'node-service': {
    meta: {
      name: 'node-service',
      basedOn: 'clean-architecture',
      oneLine:
        'Generic Node/TS service Clean Architecture with a framework-free shared/ kernel and optional src/modules/* vertical slices (public-api boundary).',
    },
    fragment: NODE_SERVICE,
  },
  'nestjs-clean': {
    meta: {
      name: 'nestjs-clean',
      basedOn: 'clean-architecture',
      oneLine:
        'Clean Architecture inside per-feature NestJS modules (src/modules/*/{domain,application,infrastructure,presentation}); pure domain, @Injectable use-cases, module public API.',
    },
    fragment: NESTJS_CLEAN,
  },
  'nest-js': {
    meta: {
      name: 'nest-js',
      basedOn: 'framework-official',
      oneLine:
        'Official NestJS by-feature layout; controller/service/module decorator + suffix invariants, feature-module boundary, dependency injection over `new`.',
    },
    fragment: NEST_JS,
  },
  nextjs: {
    meta: {
      name: 'nextjs',
      basedOn: 'framework-official + clean-architecture',
      oneLine:
        'Next.js App Router: app/** presentation (pages/route handlers/server actions/components) + Clean Architecture in src/; handlers never touch the ORM directly.',
    },
    fragment: NEXTJS,
  },
  'tanstack-starter': {
    meta: {
      name: 'tanstack-starter',
      basedOn: 'framework-official + clean-architecture',
      oneLine:
        'TanStack Start: src/routes + server functions presentation over a Clean Architecture core (src/core/{domain,application} + src/infrastructure).',
    },
    fragment: TANSTACK_STARTER,
  },
  adonisjs: {
    meta: {
      name: 'adonisjs',
      basedOn: 'framework-official',
      oneLine:
        'AdonisJS 6 convention layout (app/{controllers,models,services,validators,policies,…}); thin controllers, BaseModel/BasePolicy inheritance, routing in start/.',
    },
    fragment: ADONISJS,
  },
  elysiajs: {
    meta: {
      name: 'elysiajs',
      basedOn: 'clean-architecture',
      oneLine:
        'ElysiaJS one-instance-per-controller presentation over a Clean Architecture core; modules expose a public API, domain never imports elysia.',
    },
    fragment: ELYSIAJS,
  },
  'encore-ts': {
    meta: {
      name: 'encore-ts',
      basedOn: 'framework-official',
      oneLine:
        'Encore.ts service-per-directory (encore.service.ts boundary); api/infrastructure/domain layers, cross-service only via ~encore/clients, thin api() handlers.',
    },
    fragment: ENCORE_TS,
  },
};

/** Public preset names (registry keys), sorted, for the CLI and init --preset. */
export function presetNames(): string[] {
  return Object.keys(PRESETS).sort();
}

export type { PresetEntry, PresetFragment, PresetMeta } from './types.js';
