import { describe, expect, it } from 'vitest';

import { runExpectation } from '../helpers/analysis.js';

const at = (path: string) => `/proj/${path}`;

describe('haveSuffix clause', () => {
  it('passes when the exported symbol carries the suffix', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class UserController {}` },
      { name: 'suffix', expect: { path: 'src/**' }, to: { haveSuffix: ['Controller'] } },
    );
    expect(v).toEqual([]);
  });

  it('fails when the suffix is missing', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class UserService {}` },
      { name: 'suffix', expect: { path: 'src/**' }, to: { haveSuffix: ['Controller'] } },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.symbol).toBe('UserService');
  });

  it('accepts any of multiple suffixes', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class CreateUserUseCase {}` },
      { name: 'suffix', expect: { path: 'src/**' }, to: { haveSuffix: ['Controller', 'UseCase'] } },
    );
    expect(v).toEqual([]);
  });
});
