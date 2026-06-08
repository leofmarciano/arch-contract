import type { RawConfig } from '../schema.js';

/**
 * A preset is a partial, SCHEMA-VALID config fragment merged under the user's
 * config. It must NOT carry metadata keys (description, rationale, …) — the
 * config schema is `.strict()` at every level, so only these sections are
 * allowed. A preset never sets `version`/`project` (always the user's).
 */
export type PresetFragment = Partial<
  Pick<RawConfig, 'paths' | 'layers' | 'ruleset' | 'rules' | 'expectations' | 'modules'>
>;

export interface PresetMeta {
  name: string;
  /** `clean-architecture` | `hexagonal` | `framework-official` */
  basedOn: string;
  /** one-line description shown by `arch-contract presets` */
  oneLine: string;
}

export interface PresetEntry {
  meta: PresetMeta;
  fragment: PresetFragment;
}
