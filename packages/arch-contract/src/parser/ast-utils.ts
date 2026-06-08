import { Node } from 'ts-morph';

import type { SymbolKind } from '../core/types.js';

export interface Pos {
  line: number;
  column: number;
}

export function pos(node: Node): Pos {
  const sf = node.getSourceFile();
  const lc = sf.getLineAndColumnAtPos(node.getStart());
  return { line: lc.line, column: lc.column };
}

export function kindOfNode(node: Node): SymbolKind {
  if (Node.isClassDeclaration(node) || Node.isClassExpression(node)) return 'class';
  if (Node.isInterfaceDeclaration(node)) return 'interface';
  if (Node.isTypeAliasDeclaration(node)) return 'type';
  if (Node.isEnumDeclaration(node)) return 'enum';
  if (
    Node.isFunctionDeclaration(node) ||
    Node.isFunctionExpression(node) ||
    Node.isArrowFunction(node)
  ) {
    return 'function';
  }
  if (Node.isVariableDeclaration(node)) return 'const';
  return 'unknown';
}

/** Decorator name without its factory-call arguments: `@Injectable()` -> `Injectable`. */
export function decoratorName(raw: string): string {
  return raw.replace(/^@/, '').split('(')[0]?.trim() ?? raw;
}
