# Scotia Móvil MX — React Native Architecture Skills

> Instalación, cómo correr los skills y agentes, y el flujo recomendado entre
> ambos paquetes: ver el [README de la raíz](../../README.md).

Interactive audit of **layered Clean Architecture conventions** for the React
Native feature libraries of Scotia Móvil México (domain / data / presentation /
public): file and symbol naming, layer placement, mappers, view-model → UI
model mapping, contexts, navigation files, values, form structure and the
public API. **24 rules in 6 categories.** Implementation quality lives in
`react-native-scotia-movil-mx-code-quality-skills`.

## Structure

- `SKILL.md` — lean agent workflow (loaded on every run; keep it small)
- `scripts/scan.mjs` — deterministic scanner for the 24 rules (Node ≥ 18, no
  dependencies, macOS / Linux / Windows)
- `scripts/lib/core.mjs` — scanner engine (identical copy in the code-quality package)
- `rules/` — one file per rule, read only when that rule has findings
  - `_sections.md` — categories, review order and ownership
  - `_template.md` — template for new rules
- Agents that use this skill live in the repository's `agents/` folder and are
  installed separately (`install.sh` / `install.ps1`):
  - `architecture-reviewer.agent.md` — non-interactive reviewer (same scanner and rules)
  - `refactor-reviewer.agent.md` — design review of one screen / component at a
    time: split into subcomponents, extract to hook / util / view-model / UI
    mapper / values; proposes a plan and applies it only with approval
- `AGENTS.md` — compiled human reference (not read by the agent)
- `metadata.json` — version, organization and references

`tsconfig.recommended.json` now lives only in the code-quality package.

## How a run stays cheap (v2)

| Before (v1) | Now (v2) |
| --- | --- |
| Step 1 explored the repo (`list_dir` recursive + `read_file` of key files) | `scripts/scan.mjs` runs every detection; only its ~30-line output enters the context |
| Project profile + 5 context questions on every run | `.scotia-audit/profile.md` is created once (`--init-profile`) and reused by both skills |
| "Preliminary analysis" with *estimated* findings for all categories | Summary with *real* hit counts, only for rules that have hits |
| Every rule announced, reviewed and followed by a dialog, even clean ones | Clean rules are silent; only selected rules with hits are reviewed |
| All rule files potentially loaded | `rules/<id>.md` read only for selected rules with hits |
| Whole files read to compare against the rule | Only the reported line ranges are read |
| Whole project audited every time | Default scope = changes vs the base branch once a baseline exists |
| Skipped findings reappeared on the next run | Skips go to `.scotia-audit/architecture-baseline.tsv` and are suppressed |
| Typecheck output pasted in full | `2>&1 \| tail -n 30`, once per rule |

## Scanner

Run from the audited project root:

```bash
node <skill>/scripts/scan.mjs --init-profile          # once per project → .scotia-audit/profile.md
node <skill>/scripts/scan.mjs                         # summary (auto scope)
node <skill>/scripts/scan.mjs --scope=full            # or diff | <path>; --base=<ref>
node <skill>/scripts/scan.mjs --only=Presentation     # category prefix or rule ids, comma-separated
node <skill>/scripts/scan.mjs --rule=naming-conventions   # every candidate hit of one rule
node <skill>/scripts/scan.mjs --skip=<rule>:<file>:<line> # add a finding to the baseline
```

Per-project differences go in `.scotia-audit/profile.md` (commit it):
`layers_root`, `src_root`, `naming_variant` (`feature-library` |
`design-system`), `base_branch`, `typecheck_cmd`, `lint_cmd`, `exclude`,
`disabled_rules`, `values_root`, `theme_hook`. Rules that do not apply (e.g. forms without
`react-hook-form`) are reported as N/A automatically.

## Boundaries with the code-quality package

Each check has exactly one owner.

| Topic | Architecture owns | Code quality owns |
| --- | --- | --- |
| Hooks | name `use<Feature>`, file, folder, `.ts`/`.tsx` (`hooks-conventions`) | Rules of Hooks, dependencies, cleanup, extracting duplicated logic |
| Context | files, provider as composition root, accessors in `contexts/hooks`, no raw `useContext` in screens, single state ownership | `createContext<T \| undefined>`, guard `throw`, memoized value, reactive state |
| Navigation | navigator / params files, where the ParamList lives, no logic, close via host | native-stack, ParamList as generic, typed screen props and `navigate()` |
| Values | `values/{colors,dimens,strings,regex,dates}.ts`; screen texts → `strings`, `''` → `strings.common.empty`, regex literals → `regex`, date formats → `dates` | hardcoded colors (fix order: `canvasTheme` via the canvas-core hook, then `values/colors.ts`) |
| Dates | where formats / `Intl` options, `locale`, `timeZone` live (`values/dates.ts`) | which date API per usage, parsing, locale / time zone, date math, formatter reuse, date libraries (`date-*`) |
| Styles | collocated in the component `.tsx`, no styles file | `StyleSheet.create` vs inline, `Platform.select`, `gap`, `satisfies`, single style without array |
| Props and params | `<comp>.props.ts` / `*.utils-params.ts` files and suffixes | interface, `Readonly<Props>`, no `any`, members A→Z, destructured in the signature A→Z without `...rest` |
| Forms | four artifacts, names, layer split, runtime deps, schema file, `createYupSchema`, messages from strings, dynamic-form structure | `Controller`, `yupResolver`, `handleSubmit` + `isValid`, Yup authoring, dynamic schema `useMemo` + `reset`, `useFieldArray`, touched |
| Data and side effects | gateway impl flow (write bodies only via `Mapper.toDataModel`), view-model owns effects (`<screen>.view-model.ts`), screens only render | typed request states, `Promise.all`, `try/catch`, cleanup |
| Compiler | — | `tsconfig.recommended.json` |

Inside this package: model file suffixes → `naming-conventions`; file case →
`conv-kebab-case-files`; hook extension → `hooks-conventions`; form runtime
dependencies → `forms-conventions`; gateway calls in screens →
`presentation-screen-conventions`.

## Changes in v2.2

- New `screen-decomposition-conventions`: the scanner measures lines, JSX
  elements, `useState` / `useReducer` and handlers per screen / component
  (thresholds in the profile: `max_component_lines`, `max_jsx_elements`,
  `max_state_hooks`, `max_handlers`) and flags `renderX()` functions and long
  pure functions inside components. The rule holds the criteria *when to split*
  and *code → destination* (view-model, hook, util, UI mapper, values).
- New `agents/refactor-reviewer.agent.md` (repository root): applies those criteria file by file. The
  audit only reports the metrics and hands the files to the agent, so whole-file
  reads never happen inside the audit.

## Changes in v2.3

- `naming-conventions`: nouns only — no action verbs in model **file names** nor
  in any declared interface / namespace / type (domain and data always, UI by
  default). Exceptions for business terms or duplication: profile key
  `model_verb_exceptions` or the baseline. Transport terms (`Request`,
  `Response`, `Payload`, `DTO`, `Body`, `Json`, `Raw`…) are forbidden in domain
  and UI names; extra terms with `domain_forbidden_terms`.
- `domain-model-conventions`: main `export interface XDomainModel`; the
  interfaces it needs go below it in `export namespace XDomainModel` (domain
  only). No second top-level symbol, no inline object types.
- `data-model-conventions`: with a request and/or response, the main symbol is
  `export namespace XDataModel` with nested **namespaces** `Request` /
  `Response` (`Payload` + nested interfaces). Data only.
- `presentation-view-model-conventions`: a gateway result stored in state always
  goes through `toUiModel` (create the UI model and mapper when missing; no
  field-by-field copying); data sent through the gateway always goes through
  `XMapper.toDataModel(formFields | uiModel)`.
- `presentation-ui-mapper-conventions` / `data-mapper-conventions`: direction
  tables for `toDataModel` in presentation (UI / form → domain) and data
  (domain → API request).
- `utils-conventions`: every `<name>.utils.ts` needs its sibling
  `<name>.utils-params.ts`; functions with input take one object typed
  `<Name>UtilsParams.<FnName>`.
- `values-conventions`: `dates.ts` also holds `locale` / `timeZone`; the date API
  choice belongs to the new code-quality **Dates** category (`date-*`).
  Template literals made only of interpolations are no longer reported as text.
