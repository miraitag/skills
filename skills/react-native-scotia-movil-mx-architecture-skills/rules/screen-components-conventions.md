---
title: Screen components (components folder)
impact: HIGH
impactDescription: splits each screen into cohesive, reusable pieces
tags: presentation, components, screen, props, segmentation
skill: screen-components-conventions
---

## Screen components (`components/`)

**Impact: HIGH**

The `components/` folder exists only **inside `screens/`** to split each screen
into its parts. There are two locations:

- **Private to a screen**: `screens/<screen>/components/<component>/` — pieces
  of that particular screen.
- **Shared across screens**: `screens/components/<component>/` — pieces reusable
  by several screens (e.g. `currencyTextField`, `optionsSheet`, `searchSelect`,
  `topAppBar`, `snackbar`).

> There is no `components/` folder at the root of `src/private`. Components
> always live under `screens/`.

### Rules

1. **One folder per component in camelCase**: `beneficiariesFooter/`,
   `currencyTextField/`.
2. **Component file**: `<component>.tsx` in kebab-case; the exported symbol is
   PascalCase (`BeneficiariesFooter`).
3. **Props in a separate file**: `<component>.props.ts(x)` with a
   `ComponentNameProps` interface.
4. **Optional local subfolders** — a component can be segmented just like a
   screen, with the same conventions as its layer. Each subfolder is optional
   and is created only if the content justifies it:
   - `model/` — the component's local models: `<comp>.model.ts` (local
     view/props model; uses the `.model.ts` suffix, not `.ui-model.ts`, because
     it is an internal component type, not a screen domain UI model).
   - `utils/` — the component's pure functions (see `utils-conventions`):
     `<comp>.utils.ts` + `<comp>.utils-params.ts` with a namespace
     `XUtilsParams`.
   - `hooks/` — the component's state/effects (see `hooks-conventions`):
     `use<Feature>.ts(x)` with the `use` prefix.
   - `components/` — nested subcomponents of the component (e.g. its shimmer):
     `components/<subComponent>/<sub-component>.tsx` + `.props.ts`. Shallow
     nesting (1–2 levels); if it grows too much, promote the subcomponent to
     `screens/components/` (shared).
5. **Collocated styles** inside the component `.tsx` (no separate
   `*.styles.ts` file). *How* styles are written (`StyleSheet.create` vs inline)
   is the code-quality rule `styles-stylesheet-create`.
6. **The component only renders**: logic/state goes in its hook or in the
   screen's view-model; it receives data already in UI model / props form.
7. **Shallow nesting** (typically 1–2 levels).

> **Same rule for the main screens**: a screen (`<screen>/`) can also have its
> own `hooks/`, `utils/`, and `model/` subfolders when its logic warrants it —
> not only the components. Apply the `hooks-conventions` and `utils-conventions`
> conventions at both levels.

**Correct structure:**

```
calculateTransfer/
├── calculate-transfer.screen.tsx
├── components/
│   └── informationSheet/
│       ├── information-sheet.tsx
│       ├── information-sheet.props.ts
│       └── model/
│           └── information-sheet.model.ts
```

**Component with all subfolders (grounded in the repo):**

```
screens/components/searchSelect/
├── search-select.tsx
├── search-select.props.ts
├── model/
│   └── search-select.model.ts
├── utils/
│   ├── search-select.utils.ts
│   └── search-select.utils-params.ts
└── components/                       # nested subcomponents
    └── searchSelectShimmer/
        ├── search-select-shimmer.tsx
        └── search-select-shimmer.props.ts
```

**Detection:**

```bash
# components/ outside screens/ (not allowed at the root of private)
find src/private -type d -name components ! -path "*/screens/*"
# Components without a separate props file
for c in $(find src/private/presentation/screens -type d -path "*/components/*" -maxdepth 6); do ls "$c"/*.props.ts* >/dev/null 2>&1 || echo "no props: $c"; done
# Separate styles files (styles are collocated)
find src/private/presentation/screens -name "*.styles.ts"
# File case → conv-kebab-case-files · utils-params names → utils-conventions · hook names → hooks-conventions
```

**Correction:**

1. Move the component to `screens/<screen>/components/` (private) or
   `screens/components/` (shared) according to its reuse.
2. Extract props to `<component>.props.ts` with a `ComponentNameProps` interface.
3. Move logic/state to a hook or the view-model.
4. `pnpm typecheck` + `pnpm lint`.
