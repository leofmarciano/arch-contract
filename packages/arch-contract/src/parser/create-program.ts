import { Project, type SourceFile, ts } from 'ts-morph';

export interface CreateProjectInput {
  /** use an in-memory filesystem (hermetic tests) */
  inMemory?: boolean;
  /** load compiler options from a tsconfig (real runs) */
  tsConfigFilePath?: string;
  /** explicit compiler options (e.g. resolved baseUrl/paths) */
  compilerOptions?: ts.CompilerOptions;
}

const BASE_OPTIONS: ts.CompilerOptions = {
  allowJs: true,
  // Classic-node resolution lets `./user` and tsconfig `paths` resolve without
  // requiring file extensions in specifiers — what hand-written fixtures use.
  moduleResolution: ts.ModuleResolutionKind.Node10,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
};

/**
 * Create a configured ts-morph Project. The Project is the only place ts-morph
 * is instantiated; readers operate on its SourceFiles. Files are added
 * explicitly (we never auto-pull dependency or lib files) to bound parse cost.
 */
export function createProject(input: CreateProjectInput = {}): Project {
  const project = new Project({
    useInMemoryFileSystem: input.inMemory ?? false,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    compilerOptions: { ...BASE_OPTIONS, ...(input.compilerOptions ?? {}) },
    ...(input.tsConfigFilePath !== undefined ? { tsConfigFilePath: input.tsConfigFilePath } : {}),
  });
  return project;
}

/** Add an in-memory fixture file and return its SourceFile. */
export function addFixture(project: Project, filePath: string, source: string): SourceFile {
  return project.createSourceFile(filePath, source, { overwrite: true });
}
