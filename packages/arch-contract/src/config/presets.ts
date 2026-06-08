/**
 * Preset resolution + merge.
 *
 * `applyPresets(raw)` runs in validate-config.ts BEFORE the zod schema: it reads
 * the user's `presets` key, folds the named built-in fragments left-to-right,
 * applies the user's own config on top (user always wins), strips `presets`, and
 * returns a normal v1 config object for the unchanged schema + normalize path.
 */
import { UnknownPresetError } from './errors.js';
import { PRESETS } from './presets/index.js';

type AnyRecord = Record<string, unknown>;
type LayerLike = { name: string };
type NamedLike = { name: string };

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

export function normalizePresetNames(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return [];
}

/** Concat + dedupe by `name`; override replaces in place, keeping base order (first-match-wins is load-bearing). */
function mergeByName<T extends NamedLike>(base: T[] | undefined, override: T[] | undefined): T[] | undefined {
  if (base === undefined && override === undefined) return undefined;
  const result: T[] = base ? [...base] : [];
  const indexByName = new Map(result.map((x, i) => [x.name, i]));
  for (const item of override ?? []) {
    const idx = indexByName.get(item.name);
    if (idx !== undefined) result[idx] = item;
    else {
      indexByName.set(item.name, result.length);
      result.push(item);
    }
  }
  return result;
}

function mergeRecord(base: AnyRecord | undefined, override: AnyRecord | undefined): AnyRecord | undefined {
  if (base === undefined && override === undefined) return undefined;
  return { ...(base ?? {}), ...(override ?? {}) };
}

/** include: replace (override wins); exclude: concat + dedupe. */
function mergePaths(base: AnyRecord | undefined, override: AnyRecord | undefined): AnyRecord | undefined {
  if (base === undefined && override === undefined) return undefined;
  const out: AnyRecord = {};
  const include = override?.['include'] ?? base?.['include'];
  if (include !== undefined) out['include'] = include;
  const exclude = [...toArray(base?.['exclude'] as string | string[] | undefined), ...toArray(override?.['exclude'] as string | string[] | undefined)];
  if (exclude.length > 0) out['exclude'] = [...new Set(exclude)];
  return out;
}

/**
 * Deep-merge two config fragments; `override` (ultimately the user) wins. Keys
 * other than the six mergeable sections (e.g. version/project/agent) are taken
 * from override via the initial spread.
 */
export function mergeFragment(base: AnyRecord, override: AnyRecord): AnyRecord {
  const out: AnyRecord = { ...base, ...override };

  const set = (key: string, value: unknown): void => {
    if (value === undefined) delete out[key];
    else out[key] = value;
  };

  set('layers', mergeByName(base['layers'] as LayerLike[] | undefined, override['layers'] as LayerLike[] | undefined));
  set('rules', mergeByName(base['rules'] as NamedLike[] | undefined, override['rules'] as NamedLike[] | undefined));
  set('expectations', mergeByName(base['expectations'] as NamedLike[] | undefined, override['expectations'] as NamedLike[] | undefined));
  set('ruleset', mergeRecord(base['ruleset'] as AnyRecord | undefined, override['ruleset'] as AnyRecord | undefined));
  set('paths', mergePaths(base['paths'] as AnyRecord | undefined, override['paths'] as AnyRecord | undefined));
  set('modules', mergeRecord(base['modules'] as AnyRecord | undefined, override['modules'] as AnyRecord | undefined));

  return out;
}

/** Resolve `presets`, merge fragments left-to-right, then the user's config on top; strip the key. */
export function applyPresets(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as AnyRecord;
  const names = normalizePresetNames(obj['presets']);
  if (names.length === 0) return raw;

  let acc: AnyRecord = {};
  for (const name of names) {
    const entry = PRESETS[name];
    if (!entry) throw new UnknownPresetError(name, Object.keys(PRESETS));
    acc = mergeFragment(acc, entry.fragment as AnyRecord);
  }

  const { presets: _omit, ...userWithoutPresets } = obj;
  return mergeFragment(acc, userWithoutPresets as AnyRecord);
}
