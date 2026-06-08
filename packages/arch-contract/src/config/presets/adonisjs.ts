import type { PresetFragment } from './types.js';

// AdonisJS 6 official convention layout (app/-rooted, snake_case filenames). We
// follow the framework's own structure: thin controllers, Lucid models, VineJS
// validators, Bouncer policies, routing confined to start/.
export const ADONISJS: PresetFragment = {
  paths: {
    include: ['app', 'start', 'config', 'database', 'providers', 'commands'],
    exclude: ['**/*.spec.ts', '**/*.test.ts', '**/*.d.ts', 'tests/**'],
  },
  layers: [
    { name: 'routes', match: ['start/routes.ts', 'start/routes/**/*.ts'] },
    // `start/env.ts` is the validated-env primitive read by almost every config
    // file and service — a foundational leaf, not part of the HTTP kernel. It must
    // be matched BEFORE the `start/**/*.ts` kernel catch-all (first-match-wins).
    { name: 'env', match: ['start/env.ts'] },
    { name: 'kernel', match: ['start/kernel.ts', 'start/**/*.ts'] },
    { name: 'controllers', match: ['app/controllers/**/*.ts'] },
    { name: 'middleware', match: ['app/middleware/**/*.ts'] },
    { name: 'validators', match: ['app/validators/**/*.ts'] },
    { name: 'policies', match: ['app/policies/**/*.ts'] },
    { name: 'services', match: ['app/services/**/*.ts'] },
    { name: 'models', match: ['app/models/**/*.ts'] },
    { name: 'exceptions', match: ['app/exceptions/**/*.ts'] },
    { name: 'mails', match: ['app/mails/**/*.ts'] },
    { name: 'listeners', match: ['app/listeners/**/*.ts', 'app/events/**/*.ts'] },
    { name: 'providers', match: ['providers/**/*.ts'] },
    { name: 'commands', match: ['commands/**/*.ts'] },
    { name: 'config', match: ['config/**/*.ts'] },
    { name: 'database', match: ['database/migrations/**/*.ts', 'database/seeders/**/*.ts', 'database/factories/**/*.ts'] },
  ],
  ruleset: {
    routes: { mayDependOn: ['controllers', 'middleware', 'kernel', 'config', 'env'] },
    kernel: { mayDependOn: ['middleware', 'controllers', 'config', 'env'] },
    controllers: { mayDependOn: ['services', 'validators', 'policies', 'models', 'exceptions', 'config', 'env'] },
    middleware: { mayDependOn: ['services', 'policies', 'exceptions', 'config', 'env'] },
    validators: { mayDependOn: ['config', 'env'] },
    policies: { mayDependOn: ['models', 'services', 'exceptions', 'config', 'env'] },
    services: { mayDependOn: ['models', 'validators', 'exceptions', 'mails', 'listeners', 'config', 'env'] },
    models: { mayDependOn: ['config', 'env'] },
    exceptions: { mayDependOn: ['config', 'env'] },
    mails: { mayDependOn: ['models', 'config', 'env'] },
    listeners: { mayDependOn: ['services', 'models', 'mails', 'exceptions', 'config', 'env'] },
    providers: { mayDependOn: ['services', 'config', 'env'] },
    commands: { mayDependOn: ['services', 'models', 'config', 'env'] },
    // `config` legitimately reads the validated env primitive; `env` is a leaf.
    config: { mayDependOn: ['env'] },
    env: { mayDependOn: [] },
    database: { mayDependOn: ['models', 'config', 'env'] },
  },
  rules: [
    {
      name: 'controllers-must-not-query-models-directly',
      type: 'forbidden-import',
      from: { layer: 'controllers' },
      to: { match: 'app/models/**/*.ts' },
      severity: 'error',
    },
    {
      name: 'models-must-not-depend-on-services',
      type: 'forbidden-import',
      from: { layer: 'models' },
      to: { layer: 'services' },
      severity: 'error',
    },
    {
      name: 'validators-are-isolated',
      type: 'forbidden-import',
      from: { layer: 'validators' },
      to: { match: 'app/{controllers,services,models,policies}/**/*.ts' },
      severity: 'error',
    },
    { name: 'no-file-cycles', type: 'no-cycles', scope: 'file', severity: 'error' },
  ],
  expectations: [
    {
      name: 'controllers-are-classes-with-controller-suffix',
      expect: { layer: 'controllers' },
      to: { be: ['class'], haveSuffix: ['Controller'], notHave: ['namespaceExport'] },
      severity: 'error',
    },
    {
      name: 'controllers-stay-thin',
      expect: { layer: 'controllers' },
      to: {
        notInstantiate: ['*Model', 'PrismaClient'],
        notDependOnPackages: ['@adonisjs/lucid/database', '@adonisjs/lucid/services/db'],
        notCall: ['console.log', 'process.exit'],
      },
      severity: 'error',
    },
    {
      name: 'models-extend-basemodel',
      expect: { layer: 'models' },
      to: { be: ['class'], extend: ['BaseModel'], notHave: ['namespaceExport'] },
      severity: 'error',
    },
    {
      name: 'models-have-no-http-concerns',
      expect: { layer: 'models' },
      to: {
        notDependOnPaths: ['app/controllers/**', 'app/middleware/**', 'start/**'],
        notDependOnPackages: ['@adonisjs/core/http'],
      },
      severity: 'error',
    },
    {
      name: 'middleware-are-classes-with-handle',
      expect: { layer: 'middleware' },
      to: { be: ['class'], haveMethod: ['handle'], haveSuffix: ['Middleware'] },
      severity: 'error',
    },
    {
      name: 'policies-extend-basepolicy',
      expect: { layer: 'policies' },
      to: { be: ['class'], extend: ['BasePolicy'], haveSuffix: ['Policy'] },
      severity: 'error',
    },
    {
      name: 'services-have-no-http-or-router',
      expect: { layer: 'services' },
      to: {
        notDependOnPackages: ['@adonisjs/core/services/router'],
        notDependOnPaths: ['app/controllers/**', 'start/routes*.ts'],
        notCall: ['console.log', 'process.exit'],
      },
      severity: 'error',
    },
    {
      name: 'custom-exceptions-extend-exception',
      expect: { path: 'app/exceptions/*_exception.ts' },
      to: { be: ['class'], extend: ['Exception'], haveSuffix: ['Exception'] },
      severity: 'error',
    },
  ],
};
