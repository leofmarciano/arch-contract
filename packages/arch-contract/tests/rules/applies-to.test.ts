import { describe, expect, it } from 'vitest';

import { runExpectation } from '../helpers/analysis.js';

const at = (p: string) => `/proj/${p}`;

// A use-case file idiomatically co-locates an input/command DTO with the UseCase class.
const useCaseFile = `export interface CreateUserInput { id: string }\nexport class CreateUserUseCase { execute(_i: CreateUserInput): void {} }`;

describe('appliesTo (per-kind clause scoping)', () => {
  it('ignores a co-located non-class declaration when appliesTo: class', () => {
    const v = runExpectation(
      { [at('src/uc/CreateUserUseCase.ts')]: useCaseFile },
      {
        name: 'use-cases',
        expect: { path: 'src/**' },
        appliesTo: { kind: ['class'] },
        to: { haveSuffix: ['UseCase'], haveMethod: ['execute'] },
      },
    );
    expect(v).toEqual([]);
  });

  it('WITHOUT appliesTo, the co-located interface trips haveSuffix (the original false positive)', () => {
    const v = runExpectation(
      { [at('src/uc/CreateUserUseCase.ts')]: useCaseFile },
      { name: 'use-cases', expect: { path: 'src/**' }, to: { be: ['class'], haveSuffix: ['UseCase'] } },
    );
    expect(v.some((x) => x.symbol === 'CreateUserInput')).toBe(true);
  });

  it('still flags a wrongly-named CLASS even with appliesTo: class', () => {
    const v = runExpectation(
      { [at('src/uc/CreateUserUseCase.ts')]: `export class CreateUserService { execute(): void {} }` },
      {
        name: 'use-cases',
        expect: { path: 'src/**' },
        appliesTo: { kind: ['class'] },
        to: { haveSuffix: ['UseCase'], haveMethod: ['execute'] },
      },
    );
    expect(v.some((x) => x.symbol === 'CreateUserService')).toBe(true);
  });

  it('the clean-architecture preset accepts a co-located input DTO in a use-case', () => {
    // regression for the real-scaffold finding (root cause A) — via runExpectation we
    // verify the shared useCaseExpectation now scopes to the class.
    const v = runExpectation(
      { [at('src/application/use-cases/CreateUserUseCase.ts')]: useCaseFile },
      {
        name: 'use-cases-are-classes-with-execute',
        expect: { path: 'src/application/use-cases/**/*.ts' },
        appliesTo: { kind: ['class'] },
        to: { haveSuffix: ['UseCase'], haveMethod: ['execute'] },
      },
    );
    expect(v).toEqual([]);
  });
});
