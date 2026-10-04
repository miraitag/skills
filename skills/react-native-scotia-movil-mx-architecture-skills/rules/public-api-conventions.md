---
title: Public API (public folder)
impact: CRITICAL
impactDescription: minimal, stable public surface of the feature library
tags: public, api, barrel, props, component, index
skill: public-api-conventions
---

## Public API (`src/public/`)

**Impact: CRITICAL**

The only public surface of the feature library is `src/public/`, re-exported by
`src/index.tsx`. Everything else lives in `src/private/` and is NOT exported.

### Structure

```
src/
├── index.tsx                                   # export * from './public'
└── public/
    ├── index.ts                                # public barrel
    ├── <feature>-props.ts                      # host integration contract
    └── <Feature>.tsx                           # main embeddable component
```

### Rules

1. **Minimal barrel** in `public/index.ts`: exports ONLY the main component and
   its props type. No internals (screens, models, gateways, mappers).
   ```ts
   export type { InternationalMoneyTransferProps } from './international-money-transfer-props';
   export { InternationalMoneyTransfer } from './InternationalMoneyTransfer';
   ```
2. **`src/index.tsx`** only re-exports the public surface: `export * from './public';`.
3. **Host contract** in `<feature>-props.ts`: a `<Feature>Props` interface that
   declares the dependencies the host must inject (contracts from
   `@scotia-movil-mx/...-module-contracts`). No logic.
4. **Main component** `<Feature>.tsx` (PascalCase): only composes providers and
   the navigator; receives `<Feature>Props` and mounts the tree under the
   `Provider` (see `contexts-provider-conventions`). No business logic.
5. **Name consistency**: the component and its props share a prefix
   (`InternationalMoneyTransfer` / `InternationalMoneyTransferProps`).
6. **No exporting internals**: no file from `src/private/**` should be imported
   directly by consumers; everything goes through `public/`.

**Detection:**

```bash
# The root barrel should only re-export public
grep -vq "export \* from './public'" src/index.tsx && echo "review src/index.tsx"
# public/index.ts exporting internals
grep -rn "\.\./private" src/public/index.ts
# Internal leaks: direct imports to private from outside the package (review)
grep -rn "from '.*/src/private/" . --include="*.ts" --include="*.tsx" | grep -v "/src/"
# Public component with business logic (smell)
grep -rn "useState\|fetch\|gateway" src/public/*.tsx
```

**Correction:**

1. Reduce `public/index.ts` to only the component + props.
2. Move any logic from the public component to providers/hooks in `private/`.
3. Remove internal exports; expose new capabilities only via the props contract
   or the main component.
4. `pnpm typecheck` + `pnpm lint`.
