# react-native-scotia-movil-mx-architecture-skills — AGENTS.md

> Compiled document. Version 2.3.0
> Organization: Scotiabank México — Equipo Móvil
> 24 rules · 6 categories · Layered Clean Architecture

---

## Table of contents

1. [Names — Cross-cutting](#1-names--cross-cutting)
2. [Domain](#2-domain)
3. [Data](#3-data)
4. [Presentation](#4-presentation)
5. [Presentation structure](#5-presentation-structure)
6. [Public](#6-public)

---

## 1. Names — Cross-cutting

### 1.1 Naming conventions (HIGH)

File suffixes per layer, symbol suffixes, and noun-based names without action
verbs.

| Layer           | File suffix        | Symbol         |
| --------------- | ------------------ | -------------- |
| Presentation UI | `.ui-model.ts`     | `XUiModel`     |
| Data            | `.data-model.ts`   | `XDataModel`   |
| Domain          | `.domain-model.ts` | `XDomainModel` |

Use nouns in model **file names and every declared interface / namespace /
type** (domain and data always; UI by default): `GetAccounts`→`Accounts`,
`CreateBeneficiary`→`BeneficiaryCreation`, `SearchBanks`→`BankSearch`,
`ValidateFields`→`FieldValidation`. Exceptions (business term, duplication):
`model_verb_exceptions` in the profile or the baseline. Mapper/gateway methods
and util functions keep verbs (they are operations). Transport terms
(`Request`, `Response`, `Payload`, `DTO`, `Body`, `Json`, `Raw`…) are forbidden in
domain and UI names (extra terms: `domain_forbidden_terms`).

Details: [naming-conventions.md](rules/naming-conventions.md)

### 1.2 Kebab-case file names (MEDIUM)

File in kebab-case; export in PascalCase (components) or `useXxx` (hooks).
Avoids resolution errors on case-sensitive file systems (CI/Linux).

Details: [conv-kebab-case-files.md](rules/conv-kebab-case-files.md)

### 1.3 TypeScript suffixes by construct type (MEDIUM)

Semantic suffixes (`.interface.ts`, `.enum.ts`, `.types.ts`, `.props.ts`,
`.model.ts`) that communicate the module's content and separate runtime from types.

Details: [conv-ts-file-suffixes.md](rules/conv-ts-file-suffixes.md)

---

## 2. Domain

### 2.1 Pure domain models (HIGH)

`*.domain-model.ts`, pure types: no imports from data/presentation, no
transport `snake_case` or transport words, camelCase properties. The main model
is `export interface XDomainModel`; any other interface it needs goes **below
it** inside `export namespace XDomainModel { export interface … }` (declaration
merging) — no second top-level symbol and no inline object types.

Details: [domain-model-conventions.md](rules/domain-model-conventions.md)

### 2.2 Domain gateway interface (HIGH)

`*.gateway.ts`, interface only. Operation methods with verbs, return
`Promise<Result<Domain, ServiceError>>`, references only to domain models.

Details: [domain-gateway-conventions.md](rules/domain-gateway-conventions.md)

---

## 3. Data

### 3.1 Data models (HIGH)

`*.data-model.ts`. When there is a request and/or a response, the main symbol
is `export namespace XDataModel` with nested **namespaces** `Request` /
`Response`, each holding `Payload` and one interface per nested object. They
mirror the transport shape (`snake_case` allowed). No inline object types and no
imports from other layers.

Details: [data-model-conventions.md](rules/data-model-conventions.md)

### 3.2 Data mappers (HIGH)

`*.mapper.ts` without model suffixes. They export only `toDomainModel`/`toDataModel`;
private helpers. They do not produce UI models.

Details: [data-mapper-conventions.md](rules/data-mapper-conventions.md)

### 3.3 Gateway implementation (HIGH)

`*.gateway.impl.ts` implements the interface. Flow HTTP → data model →
`toDomainModel` → `Result`. No inline mapping or data model leaks. Write
requests (post / put / patch, `body` / `data`) send only
`Mapper.toDataModel(input)` — never an object literal or the domain model.

Details: [data-gateway-impl-conventions.md](rules/data-gateway-impl-conventions.md)

---

## 4. Presentation

### 4.1 Screen name and responsibility (CRITICAL)

`<name>.screen.tsx` kebab-case. Screens render; logic/side-effects live in the
view-model. They consume UI models, not domain/data.

Details: [presentation-screen-conventions.md](rules/presentation-screen-conventions.md)

### 4.2 UI models (CRITICAL)

`*.ui-model.ts`, `XUiModel` symbol, view shape (not a copy of the domain).
Noun-based names. No imports from data/domain.

Details: [presentation-ui-model-conventions.md](rules/presentation-ui-model-conventions.md)

### 4.3 UI mappers (CRITICAL)

`*.mapper.ts` without model suffixes. They export only `toUiModel` (domain →
UI) and/or `toDataModel` (form fields / UI model → the domain input of the
gateway); private helpers. They never produce or import data models. No
misplaced static lists.

Details: [presentation-ui-mapper-conventions.md](rules/presentation-ui-mapper-conventions.md)

### 4.4 View-model with gateway ⇒ UI mapper (CRITICAL)

File: only `<screen>.view-model.ts` exposing `use<Screen>ScreenViewModel`.
Core rule: every view-model that consumes the gateway maps each domain result to
a UI model via `toUiModel` (create the UI model and mapper if missing; no field
copying inline). Inverse: data sent through the gateway is built with
`XMapper.toDataModel(formFields | uiModel)`, never an inline object or spread.
`UiState` only with UI models. `Result<void>` writes are exempt from `toUiModel`.

Details: [presentation-view-model-conventions.md](rules/presentation-view-model-conventions.md)

---

## 5. Presentation structure

### 5.1 Screen components (HIGH)

`components/` exists only inside `screens/`: private in
`screens/<screen>/components/<comp>/` and shared in `screens/components/<comp>/`.
camelCase folder, `<comp>.tsx` + `<comp>.props.ts`, optional subfolders
`model/` (`<comp>.model.ts`), `utils/` (`<comp>.utils.ts` + `<comp>.utils-params.ts`),
`hooks/` (`use<Feature>.ts`), and `components/` for nested subcomponents.
The main screens can also have `hooks/`, `utils/`, and `model/`.
The component only renders; its styles are collocated in the `.tsx`. There is
no `components/` at the root of `private`.

Details: [screen-components-conventions.md](rules/screen-components-conventions.md)

### 5.2 Hooks: when, name, and location (HIGH)

A hook if there is state/effects/lifecycle; if it is pure it goes in `utils/`.
View-model: `use<Screen>ScreenViewModel` in `<screen>.view-model.ts`. Others:
`use<Feature>` in the `hooks/` of the corresponding scope; context: `use<Contract>`
in `contexts/hooks/`. `.ts` unless there is JSX. Single owner of hook naming,
location and extension for both packages.

Details: [hooks-conventions.md](rules/hooks-conventions.md)

### 5.3 Utilities (MEDIUM)

`*.utils.ts` in a `utils/` folder next to the feature; pure functions, named
exports. Every utils file has its sibling `<name>.utils-params.ts` (create it if
missing) with `export namespace <Name>UtilsParams { export interface <FnName> }`;
each function with input receives one object of that type (no positional or
inline-typed params). Function names can be verbs (operations).

Details: [utils-conventions.md](rules/utils-conventions.md)

### 5.4 Contexts and provider (HIGH)

`*.context.tsx`, `*.provider.tsx`, `*.provider.props.tsx`. The provider is the
composition root (instantiates gateways from host contracts). Consumption only
via accessor hooks in `contexts/hooks/`. No prop drilling. (Context typing, the
guard and the memoized value → code-quality `state-context-api`.)

Details: [contexts-provider-conventions.md](rules/contexts-provider-conventions.md)

### 5.5 Context state contracts and state ownership (HIGH)

Provider-owned global state lives in `contexts/state/<feature>/` with
`*.state.ts` contracts and optional `*.state-impl.ts` adapters. Ownership must
be explicit: either the provider creates the state internally or it receives it
from a parent, but never both. Context state hooks are accessors only.
(Reactivity → code-quality `state-context-reactivity`.)

Details: [contexts-state-conventions.md](rules/contexts-state-conventions.md)

### 5.6 Navigation (HIGH)

`*.navigator.tsx` + `*.params.ts` holding the `ParamList`. Imports screens
`<name>.screen`. No business logic. Close via `HostActionDispatcher`.
(native-stack and typed `navigate()` → code-quality `nav-stack-navigator`.)

Details: [navigation-conventions.md](rules/navigation-conventions.md)

### 5.7 Values (MEDIUM)

`values/` with `colors.ts`, `dimens.ts`, `strings.ts`, `regex.ts`, `dates.ts`:
constant objects, grouped by domain. Screen texts come from `strings` (component
configuration / variant strings excepted), empty strings are
`strings.common.empty`, regex literals live in `regex`, date formats / `Intl`
options, `locale` and `timeZone` in `dates`. No logic. (Which date API and date
correctness → code-quality Dates rules `date-*`.) (Hardcoded colors → code-quality `conv-design-tokens`: `canvasTheme`
first, `values/colors.ts` as fallback.)

Details: [values-conventions.md](rules/values-conventions.md)

### 5.8 Validation schemas (MEDIUM)

`*.schema.ts` with Yup, typed with the form's values model (`createYupSchema`).
Messages from `values/strings.ts`. No side-effects. (Runtime dependencies →
`forms-conventions`; resolver wiring → code-quality `api-rhf-yup-resolver`.)

Details: [schemas-conventions.md](rules/schemas-conventions.md)

### 5.9 Forms — structure and layer split (HIGH)

Four artifacts with fixed names and owners: `<Feature>FormFields` model (types
both the schema and `useForm<FormFields>`), `<screen>.schema.ts` (rules),
`<screen>.screen.tsx` (renders and wires, no side-effects, no manual field
state) and the view-model (gateway, loading, error, navigation, submit
handler). `react-hook-form`, `yup` and `@hookform/resolvers` are runtime
dependencies. RHF/Yup API usage (Controller, resolver, `handleSubmit` +
`isValid`) → code-quality `api-rhf-*` / `api-form-submit-viewmodel`.

Details: [forms-conventions.md](rules/forms-conventions.md)

### 5.10 Dynamic forms — runtime-built RHF + Yup (HIGH)

Forms whose fields are only known at runtime (a gateway returns field
descriptors). The view-model fetches the domain descriptors and maps them with
`<Feature>FieldMapper.toUiModel` to `<Feature>FieldUiModel`
(`model/<feature>-field.ui-model.ts`); the open `FormFields` map
(`Record<string, string | undefined>`) lives in `model/<feature>.model.ts`; the schema is a **factory** in
`<screen>.schema.ts`; and the screen derives `schema` + `defaultValues` from the
fields. The RHF/Yup construction mechanics (`useMemo`, `reset`, the
`Controller` loop) live in the code-quality rule `api-dynamic-schema-builder`.

Details: [forms-dynamic-conventions.md](rules/forms-dynamic-conventions.md)

### 5.11 Screen and component decomposition (MEDIUM)

Size metrics per screen / component (lines without imports and styles, JSX
elements, state hooks, handlers; thresholds in the profile), no `renderX()`
helpers and no long pure functions inside components. Split by visual
section, long conditional branch or repeated block; extracted code goes to the
view-model (orchestration), a hook (state / effects), a util (pure), a UI
mapper (domain → UI) or `values/`. Refactors are done by
the **Refactor Reviewer** agent (`agents/refactor-reviewer.agent.md`).

Details: [screen-decomposition-conventions.md](rules/screen-decomposition-conventions.md)

---

## 6. Public

### 6.1 Public API (CRITICAL)

`src/public/` is the only public surface, re-exported by `src/index.tsx`.
Minimal barrel: only the main component `<Feature>.tsx` and its interface
`<Feature>Props` (host contract). Exporting internals from `src/private/**` is
forbidden.

Details: [public-api-conventions.md](rules/public-api-conventions.md)
