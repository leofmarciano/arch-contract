import { describe, expect, it } from 'vitest';

import { runExpectation } from '../helpers/analysis.js';

const at = (path: string) => `/proj/${path}`;

describe('be clause', () => {
  it('passes when the file only declares the allowed kind', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class A {}` },
      { name: 'must-be-class', expect: { path: 'src/**' }, to: { be: ['class'] } },
    );
    expect(v).toEqual([]);
  });

  it('fails for an exported declaration of a disallowed kind', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class A {}\nexport function helper() {}` },
      { name: 'must-be-class', expect: { path: 'src/**' }, to: { be: ['class'] } },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.symbol).toBe('helper');
    expect(v[0]?.message).toMatch(/is a function/);
  });
});

describe('extend / implement clauses', () => {
  it('passes when a class extends an allowed base (wildcard)', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class A extends AppEntity {}` },
      { name: 'x', expect: { path: 'src/**' }, to: { extend: ['*Entity'] } },
    );
    expect(v).toEqual([]);
  });

  it('fails when a class does not extend the required base', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class A {}` },
      { name: 'x', expect: { path: 'src/**' }, to: { extend: ['BaseController'] } },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.symbol).toBe('A');
  });

  it('passes when a class implements a wildcard interface', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class A implements UserRepositoryPort {}` },
      { name: 'x', expect: { path: 'src/**' }, to: { implement: ['*RepositoryPort'] } },
    );
    expect(v).toEqual([]);
  });

  it('fails when a class implements nothing matching', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class A implements Disposable {}` },
      { name: 'x', expect: { path: 'src/**' }, to: { implement: ['*RepositoryPort'] } },
    );
    expect(v).toHaveLength(1);
  });
});

describe('haveMethod / decorators', () => {
  it('passes when a class declares the required method', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class UseCase { execute() {} }` },
      { name: 'x', expect: { path: 'src/**' }, to: { haveMethod: ['execute'] } },
    );
    expect(v).toEqual([]);
  });

  it('fails (per missing method) when a required method is absent', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class UseCase { execute() {} }` },
      { name: 'x', expect: { path: 'src/**' }, to: { haveMethod: ['execute', 'undo'] } },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('undo');
  });

  it('haveDecorator fails when the class lacks the decorator', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class C {}` },
      { name: 'x', expect: { path: 'src/**' }, to: { haveDecorator: ['Controller'] } },
    );
    expect(v).toHaveLength(1);
  });

  it('notHaveDecorator fails when a method carries the decorator', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class C {\n  @Deprecated()\n  old() {}\n}` },
      { name: 'x', expect: { path: 'src/**' }, to: { notHaveDecorator: ['Deprecated'] } },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.symbol).toBe('C.old');
  });
});

describe('notCall / notInstantiate', () => {
  it('flags a forbidden call at its location', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export function f() { console.log('x'); }` },
      { name: 'x', expect: { path: 'src/**' }, to: { notCall: ['console.log'] } },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('console.log');
  });

  it('flags member call process.exit', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export function f() { process.exit(1); }` },
      { name: 'x', expect: { path: 'src/**' }, to: { notCall: ['process.exit'] } },
    );
    expect(v).toHaveLength(1);
  });

  it('flags forbidden instantiation via wildcard', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export function f() { return new UserRepository(); }` },
      { name: 'x', expect: { path: 'src/**' }, to: { notInstantiate: ['*Repository'] } },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('UserRepository');
  });

  it('passes when only allowed classes are instantiated', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export function f() { return new Date(); }` },
      { name: 'x', expect: { path: 'src/**' }, to: { notInstantiate: ['*Repository'] } },
    );
    expect(v).toEqual([]);
  });
});

describe('export / notHave default export', () => {
  it('export:namedOnly fails on a default export', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export default class A {}` },
      { name: 'x', expect: { path: 'src/**' }, to: { export: { mode: 'namedOnly' } } },
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('defaultExport');
  });

  it('notHave:[defaultExport] passes for named-only files', () => {
    const v = runExpectation(
      { [at('src/a.ts')]: `export class A {}` },
      { name: 'x', expect: { path: 'src/**' }, to: { notHave: ['defaultExport'] } },
    );
    expect(v).toEqual([]);
  });
});
