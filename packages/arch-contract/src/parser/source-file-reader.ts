import { Node, type SourceFile, SyntaxKind } from 'ts-morph';

import type { CallRecord, DeclarationRecord, FileFacts, NewRecord } from '../core/types.js';
import { relativePosix, toPosix } from '../project/path-utils.js';
import { kindOfNode, pos } from './ast-utils.js';
import { readClasses } from './class-reader.js';
import { readExports } from './export-reader.js';
import { readImports } from './import-reader.js';
import { readInterfaces } from './interface-reader.js';

function readSimpleDeclarations(sf: SourceFile): DeclarationRecord[] {
  const out: DeclarationRecord[] = [];
  const push = (
    node: Node & {
      getName(): string | undefined;
      isExported(): boolean;
      isDefaultExport(): boolean;
    },
  ): void => {
    const p = pos(node);
    out.push({
      name: node.getName() ?? '',
      kind: kindOfNode(node),
      isExported: node.isExported(),
      isDefaultExport: node.isDefaultExport(),
      isAbstract: false,
      extendsName: null,
      implementsNames: [],
      decorators: [],
      methods: [],
      line: p.line,
      column: p.column,
    });
  };
  for (const t of sf.getTypeAliases()) push(t);
  for (const e of sf.getEnums()) push(e);
  for (const f of sf.getFunctions()) push(f);
  return out;
}

function readCallsAndNews(sf: SourceFile): { calls: CallRecord[]; news: NewRecord[] } {
  const calls: CallRecord[] = [];
  const news: NewRecord[] = [];
  sf.forEachDescendant((node) => {
    if (Node.isCallExpression(node)) {
      // Skip decorator factory calls (`@Injectable()`) — they aren't `notCall` targets.
      if (node.getParentIfKind(SyntaxKind.Decorator)) return;
      const calleeText = node.getExpression().getText();
      const p = pos(node);
      calls.push({
        calleeText,
        rootIdentifier: calleeText.split('.')[0] ?? calleeText,
        line: p.line,
        column: p.column,
      });
    } else if (Node.isNewExpression(node)) {
      const expr = node.getExpression();
      if (!expr) return;
      const p = pos(node);
      news.push({ className: expr.getText(), line: p.line, column: p.column });
    }
  });
  return { calls, news };
}

/** A star export: `export * from './m'` or `export * as ns from './m'`. */
function hasNamespaceExport(sf: SourceFile): boolean {
  return sf
    .getExportDeclarations()
    .some((d) => d.isNamespaceExport() || d.getNamespaceExport() !== undefined);
}

/** Parse a single SourceFile into the canonical FileFacts (layer/module filled later). */
export function readSourceFile(sf: SourceFile, rootDir: string): FileFacts {
  const path = toPosix(sf.getFilePath());
  const { calls, news } = readCallsAndNews(sf);
  return {
    file: { path, relPath: relativePosix(rootDir, path), layer: null, module: null },
    imports: readImports(sf),
    exports: readExports(sf),
    declarations: [...readClasses(sf), ...readInterfaces(sf), ...readSimpleDeclarations(sf)],
    calls,
    news,
    hasNamespaceExport: hasNamespaceExport(sf),
  };
}
