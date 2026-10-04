# Scotia Móvil MX — React Native Code Quality

> Instalación, cómo correr los skills y agentes, y el flujo recomendado entre
> ambos paquetes: ver el [README de la raíz](../../README.md).

Interactive audit of **React / React Native code quality** for Scotia Móvil
México projects: side effects and cleanup, hooks, context typing and
reactivity, styles, hardcoded colors, lists, re-renders, components, RHF/Yup
API usage, async error handling, navigation typing, animations, logging and
pnpm security. **54 rules in 10 categories.** File naming, folders and layers
live in `react-native-scotia-movil-mx-architecture-skills`.

## Structure

- `SKILL.md` — lean agent workflow (loaded on every run; keep it small)
- `scripts/scan.mjs` — deterministic / heuristic scanner for the rules (Node ≥
  18, no dependencies, macOS / Linux / Windows); `--eslint` merges the
  project's own ESLint results
- `scripts/lib/core.mjs` — scanner engine (identical copy in the architecture package)
- `rules/` — one file per rule, read only when that rule has findings
  - `_sections.md` — categories, impacts and ownership
  - `_template.md` — template for new rules
- `tsconfig.recommended.json` — recommended compiler flags (single copy for both packages)
- `AGENTS.md` — compiled human reference (not read by the agent)
- `metadata.json` — version, organization and references

## How a run stays cheap (v2)

| Before (v1) | Now (v2) |
| --- | --- |
| Step 1 explored the repo and read the main source files | `scripts/scan.mjs` runs every detection; only its ~40-line output enters the context |
| Rules had no detection commands: each rule meant reading files | Every rule except 4 judgment rules has a scanner check (or an ESLint mapping) |
| Profile + 5 context questions on every run | `.scotia-audit/profile.md` is created once and shared with the architecture skill |
| "Preliminary analysis" with *estimated* findings | Summary with *real* hit counts, only for rules that have hits |
| Every rule announced one by one, each with a transition dialog | Clean and N/A rules are silent; only selected rules with hits are reviewed |
| Rules for libraries the project does not use were still reviewed | Rules are N/A automatically when their library is not in `package.json` |
| Whole project audited every time | Default scope = changes vs the base branch once a baseline exists |
| Skipped findings reappeared | Skips go to `.scotia-audit/code-quality-baseline.tsv` |

Manual-only rules (`components-children-composition`, `state-usecallback-usememo`,
`state-custom-hook`, `perf-react-memo`) are offered only for a `diff` or path
scope, because they require reading code.

## Scanner

```bash
node <skill>/scripts/scan.mjs --init-profile          # once per project → .scotia-audit/profile.md
node <skill>/scripts/scan.mjs [--eslint]              # summary (auto scope)
node <skill>/scripts/scan.mjs --scope=full            # or diff | <path>; --base=<ref>
node <skill>/scripts/scan.mjs --only=state,lists      # category prefix or rule ids
node <skill>/scripts/scan.mjs --rule=lists-stable-keys    # every candidate hit of one rule
node <skill>/scripts/scan.mjs --skip=<rule>:<file>:<line> # add a finding to the baseline
```

## Changes in v2

- `conv-hooks-prefix` → **`state-rules-of-hooks`**: the hook *name* was a
  duplicate of the architecture rule `hooks-conventions`; this package now only
  audits how hooks are *called*. Conventions has 5 rules, State and Hooks 11.
- Removed the empty "Brownfield" section from `_sections.md`.
- Scope notes added where a topic is shared with the architecture package
  (see the boundary table in that package's README): `state-context-api`,
  `state-context-reactivity`, `ts-typed-props`, `styles-stylesheet-create`,
  `conv-design-tokens`, `nav-stack-navigator`, `api-typed-fetch`,
  `api-parallel-fetch`, `state-custom-hook`, `api-yup-schema`,
  `api-dynamic-schema-builder`.
- Internal overlaps clarified: `state-useeffect-cleanup` ↔
  `state-hook-dependencies` / `state-derived-state`;
  `state-usecallback-usememo` ↔ `perf-react-memo`; `api-usefieldarray` ↔
  `lists-stable-keys`.
- `tsconfig.recommended.json` comment rewritten (it referenced rules that do
  not exist) and is now the only copy.

## Changes in v2.1

- New `ts-alphabetical-properties`: interface / object-type members A→Z (each
  nesting level), including props, utils params, models and `UiState`.
- New `ts-destructured-props`: props / params destructured in the signature, in
  the interface's order, without `...rest` or `{...props}` spreads.
- New `styles-single-style-no-array`: `style={[styles.x]}` → `style={styles.x}`.
- `conv-design-tokens`: fix order for hardcoded colors — `canvasTheme` through the
  canvas-core theme hook (`theme_hook` in the profile), then `values/colors.ts`;
  reports a project without canvas-core.
- View-model references aligned to `<screen>.view-model.ts` /
  `use<Screen>ScreenViewModel`; dynamic-form examples use `<Feature>FieldUiModel`.

## Changes in v2.2

- `state-useeffect-cleanup` now covers `useEffect`, `useLayoutEffect` and the
  callback of `useFocusEffect`, and flags `setState` after `await` / `.then`
  without a cancellation guard (`AbortController` / `cancelled` flag).
- New `state-focus-effect`: `useFocusEffect` must receive a `useCallback`;
  `useIsFocused` only when the JSX depends on focus (not to trigger effects).
- `state-useref-typed` flags `useState` values that are never read or never
  rendered (→ remove or `useRef`).

## Rule categories

| Category | Impact | Rules |
| --- | --- | --- |
| Components | CRITICAL | 6 |
| TypeScript | HIGH | 5 |
| State and Hooks | HIGH | 12 |
| Styles | MEDIUM | 6 |
| Lists | HIGH | 3 |
| Performance | HIGH | 3 |
| APIs and Data | MEDIUM | 12 |
| Navigation | HIGH | 1 |
| Animations | HIGH | 1 |
| Conventions | MEDIUM | 5 |
