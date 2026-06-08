import type { ClassDeclaration, Decorator, SourceFile } from 'ts-morph';

import type { DeclarationRecord, DecoratorRecord, MethodRecord } from '../core/types.js';
import { pos } from './ast-utils.js';

export function readDecorators(decorators: Decorator[]): DecoratorRecord[] {
  return decorators.map((d) => {
    const p = pos(d);
    return { name: d.getName(), line: p.line, column: p.column };
  });
}

export function readClass(cls: ClassDeclaration): DeclarationRecord {
  const ext = cls.getExtends();
  const methods: MethodRecord[] = cls.getMethods().map((m) => {
    const p = pos(m);
    return {
      name: m.getName(),
      decorators: readDecorators(m.getDecorators()),
      line: p.line,
      column: p.column,
    };
  });
  const p = pos(cls);
  return {
    name: cls.getName() ?? '',
    kind: 'class',
    isExported: cls.isExported(),
    isDefaultExport: cls.isDefaultExport(),
    isAbstract: cls.isAbstract(),
    extendsName: ext ? ext.getExpression().getText() : null,
    implementsNames: cls.getImplements().map((i) => i.getExpression().getText()),
    decorators: readDecorators(cls.getDecorators()),
    methods,
    line: p.line,
    column: p.column,
  };
}

export function readClasses(sf: SourceFile): DeclarationRecord[] {
  return sf.getClasses().map(readClass);
}
