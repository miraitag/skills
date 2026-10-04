---
name: react-native-scotia-movil-mx-architecture-skills
description: >
  Interactive audit of layered Clean Architecture conventions in Scotia Móvil MX
  React Native feature libraries: file and symbol naming, layer placement
  (domain / data / presentation / public), data and UI mappers, view-model →
  UI model mapping, contexts, navigation files, values, form structure and the
  public API. Use for "review architecture", "check layers / naming /
  structure". Not for React / RN implementation quality (hooks, styles,
  performance, lists, RHF/Yup API usage) — that is
  react-native-scotia-movil-mx-code-quality-skills.
license: MIT
metadata:
  author: Scotiabank México — Equipo Móvil
  version: '2.2.0'
---

# Scotia Móvil MX — Architecture Audit

Audits **where code lives and how it is named**: 24 rules in 6 categories
(index at the end). Implementation quality belongs to
`react-native-scotia-movil-mx-code-quality-skills`; see **Boundaries** and never
report those topics here.

## Token rules (apply on every run)

1. The scanner replaces exploration. Never list the repo recursively and never
   read source files to "get context" or to build the summary.
2. Read a `rules/<id>.md` file only when that rule has hits **and** the user
   selected it. Never read `rules/`, `AGENTS.md` or `README.md` wholesale.
3. Read source only around reported lines (`read_file` with a ±15 line range).
4. Keep terminal output short: append `2>&1 | tail -n 30` to typecheck/lint.
5. Clean rules are silent — no per-rule "no findings" messages or dialogs.
6. `.scotia-audit/profile.md` overrides any "In this repo" note inside a rule
   file (those notes describe the reference repository).

`SCAN` = `node <this-skill-folder>/scripts/scan.mjs` run from the project root.

| File in the audited project | Purpose |
| --- | --- |
| `.scotia-audit/profile.md` | Project profile, shared with the code-quality skill. Commit it. |
| `.scotia-audit/architecture-baseline.tsv` | Findings the team skipped; suppressed on later runs. Commit it. |

## Step 1 — Profile (once per project)

- Profile exists → read it (≈20 lines) and continue. No context questions.
- Profile missing → `SCAN --init-profile` writes a draft from `package.json`,
  lockfiles and folder probes. Ask **one** `vscode_askQuestions` only about
  fields left `unknown` (max 2 questions), save the answers in the file.

## Step 2 — Scan and pre-change summary

Run `SCAN` plus the user's argument, if any: `--scope=full | diff | <path>`,
`--only=<category-or-rule,...>`, `--base=<ref>`. Default scope is `diff`
against the base branch when a baseline exists, otherwise `full`.

Print the summary **only from the scanner output** (no file reads):

```
ARCHITECTURE AUDIT — <scope> · <N> files · <project_type>, RN <ver>
| Impact | Rule | Hits | First hit |
|---|---|---|---|
| 🔴 CRITICAL | presentation-view-model-conventions | 3 | [x.view-model.ts:74](/abs/x.view-model.ts#L74) |
Clean <n> · N/A <n> · Suppressed by baseline <n>
```

One row per rule with hits, in scanner order. `(heuristic)` rules are
candidates that Step 3 confirms. Zero hits → print the block and stop.

Then **one** `vscode_askQuestions` (multiSelect, no free text): option
`All with findings — <R> rules, <H> hits` (recommended) plus one option per
category that has hits, e.g. `Presentation — 2 rules, 5 hits`. Empty selection
→ stop.

## Step 3 — Review each selected rule with hits

Order: Names → Domain → Data → Presentation → Presentation structure → Public
(inside-out, so renames cascade once).

**Exception — `screen-decomposition-conventions`:** never refactor inside the
audit (it needs whole-file reads). Print the files with their metrics in one
table and offer one dialog: `Hand off to Refactor Reviewer` (recommended —
print a ready-to-paste prompt for the **Refactor Reviewer** agent, e.g.
`Refactor these files: <file1>, <file2>`, which the user runs by selecting that
agent in the Agent dropdown) · `Skip (baseline)` · `Continue`.

1. `SCAN --rule=<id>` → full hit list for that rule. More than 25 hits → work
   in batches: `--limit=25 --offset=<n>`, or narrow with `--scope=<folder>`, one table each.
2. Read `rules/<id>.md` (apply its **Correction** section).
3. Read only the flagged ranges; drop false positives silently (count them).
4. `run_vscode_command` → `vscode.open` on the first confirmed file.
5. Print **one** table with every confirmed finding, then **one** dialog —
   never before the table is complete, never options as chat text:

   | # | Location | Sev | Finding | Fix | Why |
   |---|---|---|---|---|---|
   | 1 | [file.ts](/abs/file.ts#L74-L78) | 🔴 | one line | one line | one line |

   Header `"<N> findings — Rule <i>/<total>: <id>"`. Options: `Apply all`
   (recommended) · `Choose one by one` · `Skip all` · `Cancel audit`.
   No confirmed findings → print `✅ <id>: no confirmed findings` and go on.
6. Act:
   - **Apply all** — apply each correction (`git mv` for renames, update every
     import), save, then validate once: `<typecheck_cmd> 2>&1 | tail -n 30`.
   - **Choose one by one** — per finding: print its table row, dialog
     `Apply` / `Skip` / `Cancel audit`. After an apply, dialog `Keep` / `Revert`
     (revert = `git checkout -- <file>` or inverse `git mv`, then show that
     finding's menu again).
   - **Skip** (all or one) — `SCAN --skip=<id>:<file>:<line>,…` so later runs
     stop reporting it.
7. If more rules remain, dialog header
   `"<id>: <a> applied, <s> skipped · Next: <next-id> (<impact>, <hits> hits)"`,
   options `Continue` (recommended) · `Skip next rule` · `Cancel audit`.

## Step 4 — Final summary (no further tool calls)

```
AUDIT COMPLETED — Architecture · rules <reviewed>/<selected> · applied <a> · skipped <s> · false positives <f>
```
Then a table `Category | Applied | Skipped` for the categories reviewed.

## Rule index (impact · what the scanner checks)

| Category | Rule (`rules/<id>.md`) | Impact |
| --- | --- | --- |
| Names | `naming-conventions` — model file/symbol suffixes, noun names, transport terms only in data | HIGH |
| Names | `conv-kebab-case-files` — file case per `naming_variant` | MEDIUM |
| Names | `conv-ts-file-suffixes` — semantic suffixes, no generic `types.ts` | MEDIUM |
| Domain | `domain-model-conventions` — pure models, no barrel, no snake_case | HIGH |
| Domain | `domain-gateway-conventions` — interface returns `Promise<Result<Domain, ServiceError>>` | HIGH |
| Data | `data-model-conventions` — `XDataModel` namespaces, no cross-layer imports | HIGH |
| Data | `data-mapper-conventions` — only `toDomainModel` / `toDataModel` exported | HIGH |
| Data | `data-gateway-impl-conventions` — HTTP → mapper → `Result`, no leaks; post/put/patch bodies only via `Mapper.toDataModel` | HIGH |
| Presentation | `presentation-screen-conventions` — `.screen.tsx`, renders only, UI models only | CRITICAL |
| Presentation | `presentation-ui-model-conventions` — `XUiModel` view shape, no data/domain imports | CRITICAL |
| Presentation | `presentation-ui-mapper-conventions` — only `toUiModel` exported | CRITICAL |
| Presentation | `presentation-view-model-conventions` — only `<screen>.view-model.ts` + `use<Screen>ScreenViewModel`; gateway result ⇒ `toUiModel`; `UiState` only UI models | CRITICAL |
| Presentation structure | `screen-components-conventions` — `components/` only in `screens/`, props file, collocated styles | HIGH |
| Presentation structure | `screen-decomposition-conventions` — size metrics (lines, JSX, state hooks, handlers), `renderX()` and long pure functions inside components → handed to the Refactor Reviewer agent | MEDIUM |
| Presentation structure | `hooks-conventions` — when / name / location / `.ts` vs `.tsx` of every hook | HIGH |
| Presentation structure | `utils-conventions` — pure `*.utils.ts` + `*.utils-params.ts` in `utils/` | MEDIUM |
| Presentation structure | `contexts-provider-conventions` — files, DI in provider, accessors only from `contexts/hooks` | HIGH |
| Presentation structure | `contexts-state-conventions` — state contracts location, single ownership | HIGH |
| Presentation structure | `navigation-conventions` — `*.navigator.tsx` + `*.params.ts`, no logic | HIGH |
| Presentation structure | `values-conventions` — `values/{colors,dimens,strings,regex,dates}.ts`; screen texts → `strings`, `''` → `strings.common.empty`, regex → `regex`, date formats → `dates` | MEDIUM |
| Presentation structure | `schemas-conventions` — `<screen>.schema.ts`, `createYupSchema<FormFields>`, messages from strings | MEDIUM |
| Presentation structure | `forms-conventions` — four form artifacts, layer split, runtime deps | HIGH |
| Presentation structure | `forms-dynamic-conventions` — runtime forms: `<Feature>FieldUiModel` in `.ui-model.ts`, mapped with `toUiModel`, schema factory location | HIGH |
| Public | `public-api-conventions` — minimal `src/public/` surface | CRITICAL |

## Boundaries (owned by code-quality — do not report here)

Context typing, guard `throw` and memoized value · reactivity of context state
· RHF/Yup API usage (Controller, resolver, `handleSubmit`, schema authoring,
dynamic schema mechanics) · hardcoded colors / design tokens · `StyleSheet` vs
inline · native-stack and typed `navigate` calls · Rules of Hooks · `any` and
props typing, alphabetical order of interface members and destructuring
without `...rest` · single style without array · `tsconfig` strictness (`tsconfig.recommended.json` lives in the
code-quality package).
