import type { Project, ts } from 'ts-morph';

import { addFixture, createProject } from '../../src/parser/create-program.js';

export function inMemoryProject(
  files: Record<string, string>,
  compilerOptions?: ts.CompilerOptions,
): Project {
  const project = createProject({ inMemory: true, ...(compilerOptions ? { compilerOptions } : {}) });
  for (const [path, source] of Object.entries(files)) addFixture(project, path, source);
  return project;
}
