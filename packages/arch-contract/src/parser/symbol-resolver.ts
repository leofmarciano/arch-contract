import type { FileFacts, SymbolKind } from '../core/types.js';

export interface SymbolEntry {
  name: string;
  /** absolute POSIX path of the declaring file */
  file: string;
  kind: SymbolKind;
  isAbstract: boolean;
  extendsName: string | null;
  implementsNames: string[];
  decorators: string[];
  methods: string[];
}

export interface SymbolIndex {
  get(name: string): SymbolEntry | undefined;
  getAll(name: string): SymbolEntry[];
  byFile(file: string): SymbolEntry[];
  all(): SymbolEntry[];
}

/** Index every exported declaration by name -> declaring file + structural facts. */
export function buildSymbolIndex(files: FileFacts[]): SymbolIndex {
  const byName = new Map<string, SymbolEntry[]>();
  const byFile = new Map<string, SymbolEntry[]>();

  for (const f of files) {
    for (const decl of f.declarations) {
      if (!decl.isExported && !decl.isDefaultExport) continue;
      if (decl.name === '') continue;
      const entry: SymbolEntry = {
        name: decl.name,
        file: f.file.path,
        kind: decl.kind,
        isAbstract: decl.isAbstract,
        extendsName: decl.extendsName,
        implementsNames: decl.implementsNames,
        decorators: decl.decorators.map((d) => d.name),
        methods: decl.methods.map((m) => m.name),
      };
      const list = byName.get(decl.name) ?? [];
      list.push(entry);
      byName.set(decl.name, list);
      const fileList = byFile.get(f.file.path) ?? [];
      fileList.push(entry);
      byFile.set(f.file.path, fileList);
    }
  }

  return {
    get: (name) => byName.get(name)?.[0],
    getAll: (name) => byName.get(name) ?? [],
    byFile: (file) => byFile.get(file) ?? [],
    all: () => [...byName.values()].flat(),
  };
}
