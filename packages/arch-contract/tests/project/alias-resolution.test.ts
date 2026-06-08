import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { normalizeConfig } from '../../src/config/normalize-config.js';
import { configSchema } from '../../src/config/schema.js';
import { analyzeProject } from '../../src/project/resolve-project.js';
import { toPosix } from '../../src/project/path-utils.js';
import { makeTmpDir, rmDir, writeFile } from '../helpers/tmp.js';

const dirs: string[] = [];
function tmp(): string {
  const d = makeTmpDir();
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) rmDir(dirs.pop() as string);
});

function analyze(dir: string, include: string[]) {
  const raw = configSchema.parse({
    version: 1,
    project: { name: 'demo' },
    paths: { include },
    layers: [{ name: 'all', match: '**/*.ts' }],
  });
  return analyzeProject(normalizeConfig(raw, { configPath: path.join(dir, 'arch-contract.yaml') }));
}

describe('analyzeProject — real alias resolution (engine C)', () => {
  it('resolves tsconfig `paths` (@/*) so the import edge is detected', () => {
    const d = tmp();
    writeFile(
      d,
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: { baseUrl: '.', moduleResolution: 'bundler', module: 'esnext', paths: { '@/*': ['./src/*'] } },
      }),
    );
    writeFile(d, 'src/infra/db.ts', `export const db = 1;`);
    writeFile(d, 'src/app/route.ts', `import { db } from '@/infra/db';\nexport const x = db;`);

    const ctx = analyze(d, ['src']);
    const users = ctx.getUsersOfFile(toPosix(path.join(d, 'src/infra/db.ts'))).map((u) => u.userFile);
    expect(users).toContain(toPosix(path.join(d, 'src/app/route.ts')));
  });

  it('resolves package.json `imports` (#alias, AdonisJS style)', () => {
    const d = tmp();
    writeFile(
      d,
      'package.json',
      JSON.stringify({ name: 'app', type: 'module', imports: { '#models/*': './app/models/*.js' } }),
    );
    writeFile(d, 'app/models/user.ts', `export default class User {}`);
    writeFile(
      d,
      'app/controllers/users_controller.ts',
      `import User from '#models/user';\nexport default class UsersController { m = User; }`,
    );

    const ctx = analyze(d, ['app']);
    const users = ctx.getUsersOfFile(toPosix(path.join(d, 'app/models/user.ts'))).map((u) => u.userFile);
    expect(users).toContain(toPosix(path.join(d, 'app/controllers/users_controller.ts')));
  });
});
