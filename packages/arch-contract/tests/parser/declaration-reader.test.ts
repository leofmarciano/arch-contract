import { describe, expect, it } from 'vitest';

import { readSourceFile } from '../../src/parser/source-file-reader.js';
import { inMemoryProject } from '../helpers/project.js';

function declsOf(source: string) {
  const project = inMemoryProject({ '/proj/src/a.ts': source });
  return readSourceFile(project.getSourceFileOrThrow('/proj/src/a.ts'), '/proj');
}

describe('declaration reading', () => {
  it('captures class extends and implements', () => {
    const facts = declsOf(`export class C extends Base implements I1, I2 {}`);
    const c = facts.declarations.find((d) => d.name === 'C');
    expect(c?.extendsName).toBe('Base');
    expect(c?.implementsNames).toEqual(['I1', 'I2']);
  });

  it('flags abstract classes', () => {
    const facts = declsOf(`export abstract class A {}`);
    expect(facts.declarations.find((d) => d.name === 'A')?.isAbstract).toBe(true);
  });

  it('captures class decorators (without factory args)', () => {
    const facts = declsOf(`@Injectable()\nexport class S {}`);
    expect(facts.declarations.find((d) => d.name === 'S')?.decorators.map((d) => d.name)).toEqual([
      'Injectable',
    ]);
  });

  it('captures class method names', () => {
    const facts = declsOf(`export class U { execute() {} private helper() {} }`);
    expect(facts.declarations.find((d) => d.name === 'U')?.methods.map((m) => m.name)).toEqual([
      'execute',
      'helper',
    ]);
  });

  it('captures interface, type, enum and function kinds', () => {
    const facts = declsOf(
      `export interface I {}\nexport type T = 1;\nexport enum E { A }\nexport function f() {}`,
    );
    const kinds = Object.fromEntries(facts.declarations.map((d) => [d.name, d.kind]));
    expect(kinds).toMatchObject({ I: 'interface', T: 'type', E: 'enum', f: 'function' });
  });

  it('handles an anonymous default-exported class', () => {
    const facts = declsOf(`export default class {}`);
    const def = facts.declarations.find((d) => d.kind === 'class');
    expect(def?.isDefaultExport).toBe(true);
    expect(def?.name).toBe('');
  });

  it('records call and new expressions (skipping decorator factory calls)', () => {
    const facts = declsOf(
      `@Injectable()\nexport class S {\n  run() {\n    console.log('x');\n    const r = new UserRepository();\n  }\n}`,
    );
    expect(facts.calls.some((c) => c.calleeText === 'console.log')).toBe(true);
    expect(facts.calls.some((c) => c.calleeText === 'Injectable')).toBe(false);
    expect(facts.news.some((n) => n.className === 'UserRepository')).toBe(true);
  });
});
