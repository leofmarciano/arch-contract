import { z } from 'zod';

const stringOrArray = z.union([z.string(), z.array(z.string())]);
const severity = z.enum(['error', 'warning']);

const projectSchema = z
  .object({
    name: z.string().min(1),
    language: z.literal('typescript').optional(),
    packageManager: z.enum(['pnpm', 'npm', 'yarn', 'bun', 'deno']).optional(),
    tsconfig: z.string().optional(),
  })
  .strict();

export const pathsSchema = z
  .object({
    include: stringOrArray.optional(),
    exclude: stringOrArray.optional(),
  })
  .strict();

export const layerSchema = z
  .object({
    name: z.string().min(1),
    match: stringOrArray,
  })
  .strict();

export const rulesetEntrySchema = z
  .object({
    mayDependOn: stringOrArray.optional(),
  })
  .strict();

/** A `{ match }` (glob) XOR `{ layer }` selector used by rule `from`/`to`/`allow`. */
const selectorSchema = z
  .object({
    match: stringOrArray.optional(),
    layer: z.string().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const hasMatch = val.match !== undefined;
    const hasLayer = val.layer !== undefined;
    if (hasMatch === hasLayer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'selector must have exactly one of `match` or `layer`',
      });
    }
  });

const exceptSchema = z
  .object({
    sameModule: z.boolean().optional(),
    publicApi: stringOrArray.optional(),
  })
  .strict();

const forbiddenImportRule = z
  .object({
    name: z.string().min(1),
    type: z.literal('forbidden-import'),
    from: selectorSchema,
    to: selectorSchema,
    except: exceptSchema.optional(),
    severity: severity.optional(),
  })
  .strict();

const allowedDependencyRule = z
  .object({
    name: z.string().min(1),
    type: z.literal('allowed-dependency'),
    from: selectorSchema,
    allow: selectorSchema,
    severity: severity.optional(),
  })
  .strict();

const noCyclesRule = z
  .object({
    name: z.string().min(1),
    type: z.literal('no-cycles'),
    scope: z.enum(['file', 'layer', 'module']).optional(),
    severity: severity.optional(),
  })
  .strict();

const publicApiBoundaryRule = z
  .object({
    name: z.string().min(1),
    type: z.literal('public-api-boundary'),
    except: z.object({ sameModule: z.boolean().optional() }).strict().optional(),
    severity: severity.optional(),
  })
  .strict();

export const ruleSchema = z.discriminatedUnion('type', [
  forbiddenImportRule,
  allowedDependencyRule,
  noCyclesRule,
  publicApiBoundaryRule,
]);

const beKind = z.enum(['class', 'interface', 'type', 'enum', 'function']);
const beSchema = z.union([beKind, z.array(beKind)]);
const notHaveVal = z.enum(['defaultExport', 'namespaceExport']);
const notHaveSchema = z.union([notHaveVal, z.array(notHaveVal)]);

const toSchema = z
  .object({
    be: beSchema.optional(),
    extend: stringOrArray.optional(),
    implement: stringOrArray.optional(),
    haveMethod: stringOrArray.optional(),
    haveDecorator: stringOrArray.optional(),
    notHaveDecorator: stringOrArray.optional(),
    notCall: stringOrArray.optional(),
    notInstantiate: stringOrArray.optional(),
    haveSuffix: stringOrArray.optional(),
    notHave: notHaveSchema.optional(),
    export: z.object({ mode: z.literal('namedOnly') }).strict().optional(),
    onlyBeUsedIn: stringOrArray.optional(),
    notBeUsedIn: stringOrArray.optional(),
    notDependOnPackages: stringOrArray.optional(),
    notDependOnPaths: stringOrArray.optional(),
  })
  .strict()
  .superRefine((to, ctx) => {
    const declared = Object.values(to).some((v) => v !== undefined);
    if (!declared) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'expectation `to` must declare at least one assertion',
      });
    }
  });

const expectSchema = z
  .object({
    path: stringOrArray.optional(),
    layer: z.string().optional(),
  })
  .strict()
  .superRefine((e, ctx) => {
    const hasPath = e.path !== undefined;
    const hasLayer = e.layer !== undefined;
    if (hasPath === hasLayer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '`expect` must have exactly one of `path` or `layer`',
      });
    }
  });

export const expectationSchema = z
  .object({
    name: z.string().min(1),
    expect: expectSchema,
    appliesTo: z.object({ kind: z.array(beKind).min(1) }).strict().optional(),
    to: toSchema,
    ignoring: stringOrArray.optional(),
    severity: severity.optional(),
  })
  .strict();

const onFailureValue = z.enum(['fix-before-finish', 'warn', 'ignore']);
const agentSchema = z
  .object({
    enabled: z.boolean().optional(),
    validationCommand: z.string().optional(),
    updateDocs: stringOrArray.optional(),
    markdownBlockId: z.string().optional(),
    instructions: stringOrArray.optional(),
    afterTask: z.object({ run: stringOrArray.optional() }).strict().optional(),
    onFailure: z
      .union([onFailureValue, z.object({ behavior: onFailureValue }).strict()])
      .optional(),
    configChangePolicy: z
      .object({ requireHumanApproval: z.boolean().optional() })
      .strict()
      .optional(),
  })
  .strict();

const baselineSchema = z.union([
  z.string().min(1),
  z.object({ path: z.string().optional(), createIfMissing: z.boolean().optional() }).strict(),
]);

export const modulesSchema = z
  .object({
    pattern: z.string().optional(),
    publicApi: z.string().optional(),
  })
  .strict();

/**
 * A preset fragment: the same six mergeable sections a built-in preset may set,
 * all OPTIONAL (note: `layers` here has NO `.min(1)` — a preset may add zero
 * layers). Built from the exact sub-schemas above so it never drifts from the
 * full config schema. Used to validate EXTERNAL preset packages at load time, so
 * a malformed fragment is reported against the package, not after the merge.
 */
export const presetFragmentSchema = z
  .object({
    paths: pathsSchema.optional(),
    layers: z.array(layerSchema).optional(),
    ruleset: z.record(z.string(), rulesetEntrySchema).optional(),
    rules: z.array(ruleSchema).optional(),
    expectations: z.array(expectationSchema).optional(),
    modules: modulesSchema.optional(),
  })
  .strict();

export const configSchema = z
  .object({
    version: z.literal(1),
    project: projectSchema,
    // Resolved + stripped by applyPresets before this schema runs; declared here
    // as defense-in-depth so the key is documented and never trips strict().
    presets: stringOrArray.optional(),
    paths: pathsSchema.optional(),
    layers: z.array(layerSchema).min(1),
    ruleset: z.record(z.string(), rulesetEntrySchema).optional(),
    rules: z.array(ruleSchema).optional(),
    expectations: z.array(expectationSchema).optional(),
    agent: agentSchema.optional(),
    baseline: baselineSchema.optional(),
    modules: modulesSchema.optional(),
    unassignedFiles: z.enum(['ignore', 'warn', 'error']).optional(),
  })
  .strict();

export type RawConfig = z.infer<typeof configSchema>;
export type PresetFragmentInput = z.infer<typeof presetFragmentSchema>;
export type RawRule = z.infer<typeof ruleSchema>;
export type RawExpectation = z.infer<typeof expectationSchema>;
export type RawTo = z.infer<typeof toSchema>;
export type RawAgent = z.infer<typeof agentSchema>;
