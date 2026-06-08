/**
 * Preset resolution seam.
 *
 * Presets (clean-architecture, hexagonal, node-service, …) are a post-MVP
 * roadmap item (spec section 18). This is the extension point where a future
 * `presets: [...]` key would be expanded/merged into the raw config before
 * schema validation. For the MVP it is the identity transform.
 */
export function applyPresets(raw: unknown): unknown {
  return raw;
}
