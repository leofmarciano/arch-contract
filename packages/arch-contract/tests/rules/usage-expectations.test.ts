import { describe, expect, it } from 'vitest';

import { runExpectation } from '../helpers/analysis.js';

const at = (path: string) => `/proj/${path}`;

describe('onlyBeUsedIn', () => {
  const files = {
    [at('src/domain/entities/User.ts')]: `export class User {}`,
    [at('src/application/uc.ts')]: `import { User } from '../domain/entities/User';\nexport const x = User;`,
    [at('src/presentation/ctrl.ts')]: `import { User } from '../domain/entities/User';\nexport const y = User;`,
  };

  it('passes for users within the allowed globs', () => {
    const v = runExpectation(files, {
      name: 'entities-usage',
      expect: { path: 'src/**/domain/entities/**/*.ts' },
      to: { onlyBeUsedIn: ['src/**/domain/**/*.ts', 'src/**/application/**/*.ts'] },
    });
    expect(v.map((x) => x.file)).toEqual(['src/presentation/ctrl.ts']);
  });

  it('reports the offending user file and the import location', () => {
    const v = runExpectation(files, {
      name: 'entities-usage',
      expect: { path: 'src/**/domain/entities/**/*.ts' },
      to: { onlyBeUsedIn: ['src/**/application/**/*.ts'] },
    });
    const presentation = v.find((x) => x.file === 'src/presentation/ctrl.ts');
    expect(presentation?.target).toBe('src/domain/entities/User.ts');
    expect(presentation?.line).toBe(1);
  });

  it('honors ignoring for the using side (barrel index.ts)', () => {
    const withBarrel = {
      ...files,
      [at('src/domain/entities/index.ts')]: `export { User } from './User';`,
    };
    const v = runExpectation(withBarrel, {
      name: 'entities-usage',
      expect: { path: 'src/**/domain/entities/**/*.ts' },
      to: { onlyBeUsedIn: ['src/**/application/**/*.ts'] },
      ignoring: ['src/**/domain/entities/index.ts'],
    });
    // index.ts is excluded as a user; only presentation remains.
    expect(v.every((x) => x.file !== 'src/domain/entities/index.ts')).toBe(true);
    expect(v.some((x) => x.file === 'src/presentation/ctrl.ts')).toBe(true);
  });
});

describe('notBeUsedIn', () => {
  it('flags a user matching a denied glob', () => {
    const files = {
      [at('src/domain/User.ts')]: `export class User {}`,
      [at('src/presentation/ctrl.ts')]: `import { User } from '../domain/User';\nexport const y = User;`,
    };
    const v = runExpectation(files, {
      name: 'no-presentation',
      expect: { path: 'src/**/domain/**/*.ts' },
      to: { notBeUsedIn: ['src/**/presentation/**/*.ts'] },
    });
    expect(v).toHaveLength(1);
    expect(v[0]?.file).toBe('src/presentation/ctrl.ts');
  });
});

describe('notDependOnPackages', () => {
  it('flags a forbidden package import in a selected file', () => {
    const v = runExpectation(
      { [at('src/domain/User.ts')]: `import axios from 'axios';\nexport const x = axios;` },
      {
        name: 'no-frameworks',
        expect: { path: 'src/**/domain/**/*.ts' },
        to: { notDependOnPackages: ['axios', '@nestjs/*'] },
      },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('axios');
  });

  it('passes when only allowed packages are imported', () => {
    const v = runExpectation(
      { [at('src/domain/User.ts')]: `import { z } from 'zod';\nexport const x = z;` },
      {
        name: 'no-frameworks',
        expect: { path: 'src/**/domain/**/*.ts' },
        to: { notDependOnPackages: ['axios'] },
      },
    );
    expect(v).toEqual([]);
  });
});

describe('notDependOnPaths', () => {
  it('flags an import that resolves into a forbidden path', () => {
    const v = runExpectation(
      {
        [at('src/api/handler.ts')]: `import { User } from '../domain/entities/User';\nexport const x = User;`,
        [at('src/domain/entities/User.ts')]: `export class User {}`,
      },
      {
        name: 'api-no-entities',
        expect: { path: 'src/**/api/**/*.ts' },
        to: { notDependOnPaths: ['src/**/domain/entities/**/*.ts'] },
      },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('src/domain/entities/User.ts');
  });
});
