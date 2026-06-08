import type { PresetFragment } from './types.js';

// Encore.ts: a service is a directory containing encore.service.ts (the public
// boundary). Endpoints use api() from encore.dev/api; infrastructure (SQLDatabase,
// Topic, secrets, cron) is declared in the owning service; cross-service calls go
// only through the generated ~encore/clients. Encore is root-rooted (not src/).
const ENCORE_CLIENTS = ['~encore/clients', '~encore/*'];

export const ENCORE_TS: PresetFragment = {
  paths: {
    include: ['**/*.ts'],
    // Encore regenerates encore.gen/** (and ~encore/*) — codegen that MUST deep-import
    // every service by design, so it is excluded from analysis.
    exclude: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.d.ts',
      'node_modules/**',
      'dist/**',
      '**/migrations/**',
      'encore.gen/**',
      '**/encore.gen/**',
      '**/*.gen.ts',
    ],
  },
  modules: { pattern: '*', publicApi: 'encore.service.ts' },
  // Order matters (first-match-wins): the specific kinds are matched first, then
  // `api` is the catch-all for the remaining service-root files (the idiomatic
  // endpoint file is `<service>/<service>.ts`, e.g. users/users.ts).
  layers: [
    { name: 'service-definition', match: ['**/encore.service.ts'] },
    {
      name: 'infrastructure',
      match: [
        '**/db.ts',
        '**/*.db.ts',
        '**/database.ts',
        '**/topics.ts',
        '**/*.topic.ts',
        '**/subscriptions.ts',
        '**/*.subscription.ts',
        '**/cron.ts',
        '**/*.cron.ts',
        '**/secrets.ts',
        '**/*.secret.ts',
      ],
    },
    {
      name: 'domain',
      match: [
        '**/*.domain.ts',
        '**/domain/**/*.ts',
        '**/*.service.ts',
        '**/services/**/*.ts',
        '**/*.model.ts',
        '**/*.entity.ts',
        '**/*.repository.ts',
        '**/repositories/**/*.ts',
        '**/*.usecase.ts',
      ],
    },
    { name: 'shared', match: ['shared/**/*.ts', 'lib/**/*.ts', 'common/**/*.ts', 'internal/**/*.ts'] },
    {
      name: 'api',
      match: ['**/*.api.ts', '**/api.ts', '**/api/**/*.ts', '**/endpoints/**/*.ts', '**/*.endpoints.ts', '**/*.ts'],
    },
  ],
  ruleset: {
    'service-definition': { mayDependOn: ['domain', 'infrastructure', 'shared'] },
    api: { mayDependOn: ['domain', 'infrastructure', 'shared', 'service-definition'] },
    domain: { mayDependOn: ['infrastructure', 'shared'] },
    infrastructure: { mayDependOn: ['shared'] },
    shared: { mayDependOn: [] },
  },
  rules: [
    {
      name: 'no-deep-cross-service-imports',
      type: 'public-api-boundary',
      except: { sameModule: true },
      severity: 'error',
    },
    { name: 'no-cross-service-cycles', type: 'no-cycles', scope: 'module', severity: 'error' },
    {
      name: 'domain-must-not-call-other-services',
      type: 'forbidden-import',
      from: { layer: 'domain' },
      to: { match: ENCORE_CLIENTS },
      severity: 'error',
    },
    {
      name: 'infrastructure-must-not-call-other-services',
      type: 'forbidden-import',
      from: { layer: 'infrastructure' },
      to: { match: ENCORE_CLIENTS },
      severity: 'error',
    },
    {
      name: 'shared-must-not-import-framework-primitives',
      type: 'forbidden-import',
      from: { layer: 'shared' },
      to: { match: ['encore.dev', 'encore.dev/**'] },
      severity: 'error',
    },
  ],
  expectations: [
    {
      name: 'api-files-have-no-default-export',
      expect: { layer: 'api' },
      to: { export: { mode: 'namedOnly' }, notHave: ['defaultExport'] },
      severity: 'error',
    },
    {
      name: 'api-handlers-stay-thin-no-inline-infra',
      expect: { layer: 'api' },
      to: { notInstantiate: ['SQLDatabase', 'PrismaClient', '*Repository', '*Client'], notCall: ['console.log'] },
      ignoring: ['**/*.test.ts', '**/*.spec.ts'],
      severity: 'error',
    },
    {
      name: 'infrastructure-declares-resources-not-endpoints',
      expect: { layer: 'infrastructure' },
      to: { notCall: ['api', 'api.raw'], notHave: ['defaultExport'] },
      severity: 'error',
    },
    {
      name: 'domain-declares-no-endpoints-and-no-web-frameworks',
      expect: { layer: 'domain' },
      to: { notCall: ['api', 'api.raw'], notDependOnPackages: ['express', '@nestjs/*', 'fastify'] },
      severity: 'error',
    },
    {
      name: 'no-process-exit',
      expect: { path: '**/*.ts' },
      to: { notCall: ['process.exit'] },
      ignoring: ['**/*.test.ts', '**/*.spec.ts', 'scripts/**'],
      severity: 'error',
    },
  ],
};
