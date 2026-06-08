import type { ImportRecord, Selector } from '../../core/types.js';
import type { RuleContext } from '../rule-context.js';

/** A glob target matches the import's specifier, resolved rel path, or package name. */
export function importMatchesGlob(
  ctx: RuleContext,
  imp: ImportRecord,
  patterns: string[],
): boolean {
  if (ctx.matchPath(imp.specifier, patterns)) return true;
  if (imp.targetFile !== null && ctx.matchPath(ctx.rel(imp.targetFile), patterns)) return true;
  if (imp.packageName !== null && ctx.matchPath(imp.packageName, patterns)) return true;
  return false;
}

export function importMatchesSelector(
  ctx: RuleContext,
  imp: ImportRecord,
  sel: Selector,
): boolean {
  if (sel.kind === 'glob') return importMatchesGlob(ctx, imp, sel.patterns);
  return imp.targetFile !== null && ctx.layerOf(imp.targetFile) === sel.layer;
}

/** A readable label for an import target, used in messages and fingerprints. */
export function importTargetLabel(ctx: RuleContext, imp: ImportRecord): string {
  if (imp.targetFile !== null) return ctx.rel(imp.targetFile);
  if (imp.packageName !== null) return imp.packageName;
  return imp.specifier;
}
