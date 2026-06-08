export {
  buildBaseline,
  serializeBaseline,
  baselineDocumentSchema,
  FINGERPRINT_VERSION,
} from './create-baseline.js';
export type { BaselineFile, BaselineEntry } from './create-baseline.js';
export { applyBaseline, loadBaseline, parseBaseline, BaselineParseError } from './apply-baseline.js';
