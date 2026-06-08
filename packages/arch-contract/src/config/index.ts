export { CONFIG_FILENAMES, discoverConfig } from './discovery.js';
export type { DiscoveryOptions, DiscoveryResult } from './discovery.js';
export {
  ConfigNotFoundError,
  ConfigParseError,
  ConfigValidationError,
  InvalidPresetError,
  PresetLoadError,
  UnknownPresetError,
  formatIssues,
} from './errors.js';
export type { ConfigIssue } from './errors.js';
export { applyPresets, looksExternal, mergeFragment } from './presets.js';
export { PRESETS, presetNames } from './presets/index.js';
export type { PresetEntry, PresetFragment, PresetMeta } from './presets/types.js';
export { loadConfigFile } from './load-config.js';
export type { LoadedConfigSource } from './load-config.js';
export { loadAndValidate, validateConfig } from './validate-config.js';
export type { LoadConfigResult } from './validate-config.js';
export { normalizeConfig, toSelector, toStringArray, expandClauses } from './normalize-config.js';
export { configSchema, presetFragmentSchema } from './schema.js';
export type { RawConfig, PresetFragmentInput } from './schema.js';
export * from './model.js';
