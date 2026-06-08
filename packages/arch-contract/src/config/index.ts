export { CONFIG_FILENAMES, discoverConfig } from './discovery.js';
export type { DiscoveryOptions, DiscoveryResult } from './discovery.js';
export {
  ConfigNotFoundError,
  ConfigParseError,
  ConfigValidationError,
  formatIssues,
} from './errors.js';
export type { ConfigIssue } from './errors.js';
export { loadConfigFile } from './load-config.js';
export type { LoadedConfigSource } from './load-config.js';
export { loadAndValidate, validateConfig } from './validate-config.js';
export type { LoadConfigResult } from './validate-config.js';
export { normalizeConfig, toSelector, toStringArray, expandClauses } from './normalize-config.js';
export { configSchema } from './schema.js';
export type { RawConfig } from './schema.js';
export * from './model.js';
