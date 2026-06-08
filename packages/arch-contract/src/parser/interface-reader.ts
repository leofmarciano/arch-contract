import type { InterfaceDeclaration, SourceFile } from 'ts-morph';

import type { DeclarationRecord, MethodRecord } from '../core/types.js';
import { pos } from './ast-utils.js';

export function readInterface(decl: InterfaceDeclaration): DeclarationRecord {
  const methods: MethodRecord[] = decl.getMethods().map((m) => {
    const p = pos(m);
    return { name: m.getName(), decorators: [], line: p.line, column: p.column };
  });
  const p = pos(decl);
  return {
    name: decl.getName(),
    kind: 'interface',
    isExported: decl.isExported(),
    isDefaultExport: decl.isDefaultExport(),
    isAbstract: false,
    extendsName: null,
    implementsNames: decl.getExtends().map((e) => e.getExpression().getText()),
    decorators: [],
    methods,
    line: p.line,
    column: p.column,
  };
}

export function readInterfaces(sf: SourceFile): DeclarationRecord[] {
  return sf.getInterfaces().map(readInterface);
}
