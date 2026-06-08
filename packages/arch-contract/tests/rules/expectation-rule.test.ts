import { describe, expect, it } from 'vitest';

import { runExpectation } from '../helpers/analysis.js';

const at = (path: string) => `/proj/${path}`;

describe('expectationRule selection & orchestration', () => {
  it('only evaluates files matching the selector', () => {
    const v = runExpectation(
      {
        [at('src/controllers/UserController.ts')]: `export class UserController {}`,
        [at('src/services/UserService.ts')]: `export class UserService {}`,
      },
      {
        name: 'controllers-suffix',
        expect: { path: 'src/**/controllers/**/*.ts' },
        to: { haveSuffix: ['Controller'] },
      },
    );
    expect(v).toEqual([]); // UserService is outside the selector
  });

  it('applies ignoring to selected files', () => {
    const v = runExpectation(
      {
        [at('src/entities/User.ts')]: `export class User {}`,
        [at('src/entities/Legacy.ts')]: `export class Legacy {}`,
      },
      {
        name: 'entities-suffix',
        expect: { path: 'src/entities/**/*.ts' },
        to: { haveSuffix: ['Entity'] },
        ignoring: ['src/entities/Legacy.ts'],
      },
    );
    expect(v.map((x) => x.symbol)).toEqual(['User']); // Legacy ignored
  });

  it('runs multiple clauses against each selected file', () => {
    const v = runExpectation(
      { [at('src/uc/CreateUser.ts')]: `export class CreateUser {}` },
      {
        name: 'uc-rules',
        expect: { path: 'src/uc/**/*.ts' },
        to: { be: ['class'], haveSuffix: ['UseCase'], haveMethod: ['execute'] },
      },
    );
    // fails haveSuffix (CreateUser) and haveMethod (execute), passes be.
    expect(v.length).toBe(2);
  });

  it('emits a fingerprint on every expectation violation (baseline-compatible)', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class A {}` },
      { name: 'x', expect: { path: 'src/**' }, to: { haveSuffix: ['Controller'] } },
    );
    expect(v[0]?.fingerprint).toBe('x:src/a.ts:A');
  });

  it('carries the expectation severity', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class A {}` },
      {
        name: 'x',
        expect: { path: 'src/**' },
        to: { haveSuffix: ['Controller'] },
        severity: 'warning',
      },
    );
    expect(v[0]?.severity).toBe('warning');
  });
});
