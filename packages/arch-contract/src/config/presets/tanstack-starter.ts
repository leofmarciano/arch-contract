import type { PresetFragment } from './types.js';
import { DOMAIN_FORBIDDEN_PACKAGES } from './_clean-arch-base.js';

// TanStack Start: file-based routes (src/routes) + server functions
// (createServerFn) are the presentation/server seam; the business core is Clean
// Architecture in src/core/{domain,application} + src/infrastructure.
const INFRA_PATHS = ['src/infrastructure/**', 'src/infra/**'];
const ORM_PACKAGES = ['@prisma/client', '@prisma/client/*', 'prisma', 'drizzle-orm', 'drizzle-orm/*', 'mongoose', 'typeorm'];

export const TANSTACK_STARTER: PresetFragment = {
  layers: [
    { name: 'presentation-routes', match: ['src/routes/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'] },
    { name: 'server-fn', match: ['src/server/**/*.{ts,tsx}', 'src/**/*.server.{ts,tsx}', 'src/**/*.functions.{ts,tsx}'] },
    { name: 'application', match: ['src/core/application/**/*.ts', 'src/application/**/*.ts', 'src/**/use-cases/**/*.ts'] },
    { name: 'domain', match: ['src/core/domain/**/*.ts', 'src/domain/**/*.ts'] },
    { name: 'infrastructure', match: ['src/infrastructure/**/*.ts', 'src/infra/**/*.ts'] },
    { name: 'shared', match: ['src/lib/**/*.{ts,tsx}', 'src/utils/**/*.{ts,tsx}', 'src/types/**/*.{ts,tsx}'] },
  ],
  ruleset: {
    'presentation-routes': { mayDependOn: ['server-fn', 'application', 'domain', 'shared'] },
    'server-fn': { mayDependOn: ['application', 'domain', 'shared'] },
    application: { mayDependOn: ['domain', 'shared'] },
    domain: { mayDependOn: [] },
    infrastructure: { mayDependOn: ['domain', 'application', 'shared'] },
    shared: { mayDependOn: [] },
  },
  rules: [{ name: 'no-file-cycles', type: 'no-cycles', scope: 'file', severity: 'error' }],
  expectations: [
    {
      name: 'domain-is-framework-free',
      expect: { layer: 'domain' },
      to: { notDependOnPackages: DOMAIN_FORBIDDEN_PACKAGES },
      severity: 'error',
    },
    {
      name: 'domain-has-no-default-or-namespace-export',
      expect: { layer: 'domain' },
      to: { notHave: ['defaultExport', 'namespaceExport'] },
      severity: 'error',
    },
    {
      name: 'application-is-framework-free',
      expect: { layer: 'application' },
      to: { notDependOnPackages: ['@tanstack/*', 'react', 'react-dom', ...ORM_PACKAGES] },
      severity: 'error',
    },
    {
      name: 'routes-and-server-fns-do-not-import-the-orm-directly',
      expect: { path: ['src/routes/**/*.{ts,tsx}', 'src/server/**/*.{ts,tsx}', 'src/**/*.server.{ts,tsx}'] },
      to: { notDependOnPackages: ORM_PACKAGES, notDependOnPaths: INFRA_PATHS },
      severity: 'error',
    },
  ],
};
