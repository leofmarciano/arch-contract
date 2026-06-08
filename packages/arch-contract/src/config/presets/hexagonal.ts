import type { RawRule } from '../schema.js';
import type { PresetFragment } from './types.js';
import { DOMAIN_FORBIDDEN_PACKAGES, useCaseExpectation } from './_clean-arch-base.js';

// Alistair Cockburn's Hexagonal / Ports & Adapters: a domain core, an
// application ring of ports (interfaces) + use cases, and symmetric primary
// (driving) and secondary (driven) adapters that must not import each other.
const PRIMARY = ['src/adapters/in/**', 'src/adapters/primary/**', 'src/adapters/inbound/**'];
const SECONDARY = [
  'src/adapters/out/**',
  'src/adapters/secondary/**',
  'src/adapters/outbound/**',
  'src/infrastructure/**',
  'src/infra/**',
];
const PORTS = ['src/application/ports/**', 'src/ports/**'];

const rules: RawRule[] = [
  { name: 'no-file-cycles', type: 'no-cycles', scope: 'file' },
  { name: 'no-layer-cycles', type: 'no-cycles', scope: 'layer' },
  {
    name: 'primary-adapters-do-not-import-secondary',
    type: 'forbidden-import',
    from: { layer: 'adapters-primary' },
    to: { layer: 'adapters-secondary' },
    severity: 'error',
  },
  {
    name: 'secondary-adapters-do-not-import-primary',
    type: 'forbidden-import',
    from: { layer: 'adapters-secondary' },
    to: { layer: 'adapters-primary' },
    severity: 'error',
  },
];

export const HEXAGONAL: PresetFragment = {
  paths: { include: ['src'], exclude: ['**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'] },
  layers: [
    { name: 'domain', match: ['src/domain/**'] },
    { name: 'application', match: ['src/application/**', 'src/ports/**', 'src/use-cases/**'] },
    { name: 'adapters-primary', match: PRIMARY },
    { name: 'adapters-secondary', match: SECONDARY },
  ],
  ruleset: {
    domain: { mayDependOn: [] },
    application: { mayDependOn: ['domain'] },
    'adapters-primary': { mayDependOn: ['application', 'domain'] },
    'adapters-secondary': { mayDependOn: ['application', 'domain'] },
  },
  rules,
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
      name: 'ports-are-interfaces',
      expect: { path: PORTS.map((p) => `${p}/*.ts`) },
      to: { be: ['interface', 'type'] },
      ignoring: ['**/index.ts', '**/*.spec.ts', '**/*.test.ts'],
      severity: 'error',
    },
    {
      name: 'driven-adapters-implement-a-port',
      expect: { path: SECONDARY.map((p) => `${p}/*Repository*.ts`) },
      to: { be: ['class'], implement: ['*Port', '*RepositoryPort', '*Repository'] },
      ignoring: ['**/index.ts', '**/*.spec.ts', '**/*.test.ts'],
      severity: 'error',
    },
    useCaseExpectation(['src/application/use-cases/**/*.ts', 'src/use-cases/**/*.ts']),
  ],
};
