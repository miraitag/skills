---
title: Utilities (utils and utils-params)
impact: MEDIUM
impactDescription: reusable pure functions, collocated by feature and typed by namespace
tags: utils, helpers, pure-functions, utils-params, presentation
skill: utils-conventions
---

## Utilities (utils / utils-params)

**Impact: MEDIUM**

Rules for utility files under `src/private/presentation`.

1. **File**: `*.utils.ts` in kebab-case, placed in a `utils/` folder next to the
   feature that uses them:
   - Screen: `screens/<screen>/utils/<screen>.utils.ts`.
   - Screen component: `screens/<screen>/components/<comp>/utils/<comp>.utils.ts`.
   - Shared component: `screens/components/<comp>/utils/<comp>.utils.ts`.
2. **Pure functions and named exports**: only pure functions (no side-effects),
   exported by name. Never `export default`.
3. **Parameters typed by namespace**: when a utility receives an input object,
   type it with a namespace in a sibling `*.utils-params.ts` file:
   `export namespace XUtilsParams { export interface FnName { ... } }`.
4. **No state or React**: utils do not use hooks or touch the DOM/UI; if they
   need state or effects, that goes in a hook (see `hooks-conventions`).
5. *(Code-quality, not here)* the params object is destructured in the
   signature in alphabetical order without `...rest` (`ts-destructured-props`)
   and its interface members are sorted (`ts-alphabetical-properties`).
6. **Function name = action** (verb allowed): `mapConceptsToOptions`,
   `formatRemainingTime`, `normalizeText` — they are operations, not models.

**Correct:**

```ts
// select-concept.utils-params.ts
export namespace SelectConceptUtilsParams {
  export interface MapConceptsToOptions {
    concepts: ConceptDomainModel[];
  }
}

// select-concept.utils.ts
export const mapConceptsToOptions = ({
  concepts,
}: SelectConceptUtilsParams.MapConceptsToOptions): Option[] =>
  concepts.map((concept) => ({ id: concept.code, label: concept.description }));
```

**Detection:**

```bash
# Utils outside a utils/ folder
find src/private/presentation -name "*.utils.ts" ! -path "*/utils/*"
# Default exports in utils
grep -rn "export default" $(find src/private/presentation -name "*.utils.ts")
# Utils with hooks/side-effects (should be hooks)
grep -rn "useState\|useEffect\|useRef\|useCallback" $(find src/private/presentation -name "*.utils.ts")
# Params without a *UtilsParams namespace
grep -rL "UtilsParams" $(find src/private/presentation -name "*.utils-params.ts" -o -name "*.utils.params.ts")
```

**Correction:**

1. Move the utility to a `utils/` folder next to its feature.
2. Convert to pure functions with named exports.
3. Extract the parameters to an `XUtilsParams` namespace in `*.utils-params.ts`.
4. If it has state/effects, convert it to a hook.
5. `pnpm typecheck` + `pnpm lint --fix`.
