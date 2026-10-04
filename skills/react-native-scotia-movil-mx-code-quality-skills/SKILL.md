---
name: react-native-scotia-movil-mx-code-quality-skills
description: >
  Interactive React / React Native code-quality audit for Scotia Móvil MX
  projects: side effects and cleanup, hook dependencies and Rules of Hooks,
  context typing and reactivity, inline styles, hardcoded colors, lists and
  keys, re-renders, images, modals, RHF/Yup API usage, async error handling,
  navigation typing, animations, logging, pnpm security and dates (Date vs
  Intl.DateTimeFormat per usage, parsing, locale / time zone, date math,
  evaluated before applying). Use for "review code quality / performance /
  hooks / styles / dates". Not for file naming, folders or layer boundaries —
  that is react-native-scotia-movil-mx-architecture-skills.
license: MIT
metadata:
  author: Scotiabank México — Equipo Móvil
  version: '2.3.0'
---

# Scotia Móvil MX — React Native Code-Quality Audit

Audits **how the code is implemented**: 62 rules in 11 categories (index at
the end). Naming, folders and layers belong to
`react-native-scotia-movil-mx-architecture-skills`; see **Boundaries** and never
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
| `.scotia-audit/profile.md` | Project profile, shared with the architecture skill. Commit it. |
| `.scotia-audit/code-quality-baseline.tsv` | Findings the team skipped; suppressed on later runs. Commit it. |

## Step 1 — Profile (once per project)

- Profile exists → read it (≈20 lines) and continue. No context questions.
- Profile missing → `SCAN --init-profile` writes a draft from `package.json`,
  lockfiles and folder probes. Ask **one** `vscode_askQuestions` only about
  fields left `unknown` (max 2 questions), save the answers in the file.
- Older profile without `date_locale` / `date_time_zone` → assume `es-MX` /
  `device`; ask once (and append both lines) only when a Dates rule is
  reviewed.

## Step 2 — Scan and pre-change summary

Run `SCAN` plus the user's argument, if any: `--scope=full | diff | <path>`,
`--only=<category-or-rule,...>`, `--base=<ref>`. Add `--eslint` when the
profile says `eslint: available` (merges the project's own ESLint results for
hook deps, Rules of Hooks, nested components, index keys, inline styles, color
literals, `any`, `console`). Default scope is `diff` against the base branch
when a baseline exists, otherwise `full`.

Print the summary **only from the scanner output** (no file reads):

```
CODE-QUALITY AUDIT — <scope> · <N> files · <project_type>, RN <ver>
| Impact | Rule | Hits | First hit |
|---|---|---|---|
| 🔴 CRITICAL | lists-flatlist-optimized | 2 | [list.tsx:31](/abs/list.tsx#L31) |
Clean <n> · N/A <n> · Suppressed by baseline <n> · Manual-only <n>
```

One row per rule with hits, in scanner order. `(heuristic)` rules are
candidates that Step 3 confirms. Zero hits and no manual rules wanted → stop.

Then **one** `vscode_askQuestions` (multiSelect, no free text): option
`All with findings — <R> rules, <H> hits` (recommended), one option per
category that has hits (`State and Hooks — 3 rules, 7 hits`), and — only when
the scope is `diff` or a path — `Manual review (<list>)` for the judgment
rules the scanner cannot detect. Empty selection → stop.

## Step 3 — Review each selected rule

Order: Components → TypeScript → State and Hooks → Styles → Lists →
Performance → APIs and Data → Dates → Navigation → Animations → Conventions.

1. `SCAN --rule=<id>` → full hit list (more than 25 hits → batches with
   `--limit=25 --offset=<n>` or a narrower `--scope=<folder>`). For a manual rule, the candidate files
   are the files in scope; read them once and evaluate all selected manual
   rules together.
2. Read `rules/<id>.md` (incorrect / correct pattern).
3. Read only the flagged ranges; drop false positives silently (count them).
4. `run_vscode_command` → `vscode.open` on the first confirmed file.
5. Print **one** table with every confirmed finding, then **one** dialog —
   never before the table is complete, never options as chat text:

   | # | Location | Sev | Finding | Fix | Why |
   |---|---|---|---|---|---|
   | 1 | [file.tsx](/abs/file.tsx#L12-L18) | 🟠 | one line | one line | one line |

   Header `"<N> findings — Rule <i>/<total>: <id>"`. Options: `Apply all`
   (recommended) · `Choose one by one` · `Skip all` · `Cancel audit`.

   **Dates rules (`date-*`) are an evaluation, not a blind fix**: the table
   adds `Decision` after `Finding` — the API the rule file's decision table
   picks for that usage (`Intl.DateTimeFormat`, `Date`, `date-fns`,
   `Intl.RelativeTimeFormat`) or `Keep — <reason>` (e.g. transport format in
   the data layer). `Fix` also lists the clean-up of the **same lines** per the
   architecture rules: format options / locale / time zone → `values/dates.ts`,
   texts → `values/strings.ts` (`''` → `strings.common.empty`), patterns →
   `values/regex.ts`, sizes → `values/dimens.ts`, a new util → its
   `<name>.utils-params.ts` (create missing files). "Keep" rows are applied as
   **Skip** (baseline).
   No confirmed findings → print `✅ <id>: no confirmed findings` and go on.
6. Act:
   - **Apply all** — apply each fix, save, then validate once:
     `<typecheck_cmd> 2>&1 | tail -n 30` (and `<lint_cmd>` the same way if the
     rule is lint-related).
   - **Choose one by one** — per finding: print its table row, dialog
     `Apply` / `Skip` / `Cancel audit`. After an apply, dialog `Keep` / `Revert`
     (revert = `git checkout -- <file>`, then show that finding's menu again).
   - **Skip** (all or one) — `SCAN --skip=<id>:<file>:<line>,…` so later runs
     stop reporting it.
7. If more rules remain, dialog header
   `"<id>: <a> applied, <s> skipped · Next: <next-id> (<impact>, <hits> hits)"`,
   options `Continue` (recommended) · `Skip next rule` · `Cancel audit`.

**After Dates fixes** (only if files changed): for each touched file run
`node <architecture-skill-folder>/scripts/scan.mjs --scope=<file> --only=values-conventions,utils-conventions`
(sibling folder `../react-native-scotia-movil-mx-architecture-skills`; missing →
skip in one line) plus this skill's `SCAN --scope=<file> --only=conv-design-tokens,ts-alphabetical-properties,ts-destructured-props`.
Hits → one table `# | Location | Owner rule | Finding | Proposed fix` and one
dialog `Apply all` · `Choose one by one` · `Leave for the owner rule`.

## Step 4 — Final summary (no further tool calls)

```
AUDIT COMPLETED — Code quality · rules <reviewed>/<selected> · applied <a> · skipped <s> · false positives <f>
```
Then a table `Category | Applied | Skipped` for the categories reviewed.

## Rule index

| Category (impact) | Rules (`rules/<id>.md`) |
| --- | --- |
| Components (CRITICAL) | `components-functional-pressable`, `components-conditional-rendering`, `components-children-composition`*, `components-image`, `components-textinput`, `components-modal` |
| TypeScript (HIGH) | `ts-typed-props`, `ts-react-fc`, `ts-generics-utility-types`, `ts-alphabetical-properties`, `ts-destructured-props` |
| State and Hooks (HIGH) | `state-usestate-typed`, `state-useeffect-cleanup`, `state-focus-effect`, `state-hook-dependencies`, `state-rules-of-hooks`, `state-usecallback-usememo`*, `state-useref-typed`, `state-context-api`, `state-context-reactivity`, `state-custom-hook`*, `state-derived-state`, `state-form-touched` |
| Styles (MEDIUM) | `styles-stylesheet-create`, `styles-responsive-flexbox`, `styles-platform-specifics`, `styles-gap-spacing`, `styles-type-assertions`, `styles-single-style-no-array` |
| Lists (HIGH) | `lists-flatlist-optimized`, `lists-stable-keys`, `lists-sectionlist` |
| Performance (HIGH) | `perf-react-memo`*, `perf-no-inline-components`, `perf-hoist-static-jsx` |
| APIs and Data (MEDIUM) | `api-typed-fetch`, `api-parallel-fetch`, `api-context-reducer`, `api-native-permissions`, `api-community-module`, `api-yup-schema`, `api-async-error-handling`, `api-rhf-controller`, `api-rhf-yup-resolver`, `api-usefieldarray`, `api-form-submit-viewmodel`, `api-dynamic-schema-builder` |
| Navigation (HIGH) | `nav-stack-navigator` |
| Animations (HIGH) | `anim-gpu` |
| Conventions (MEDIUM) | `conv-design-tokens`, `conv-theme-provider`, `conv-pnpm`, `conv-native-manifest`, `conv-dev-logging` |
| Dates (HIGH) | `date-parsing`, `date-locale-timezone`, `date-arithmetic-comparison`, `date-render-purity`, `date-api-choice`, `date-formatter-reuse`, `date-relative-time`, `date-library` |

`*` manual-only (judgment). Rules whose library is not in `package.json`
(permissions, biometrics, RHF, navigation…) are reported as N/A automatically.

## Boundaries (owned by architecture — do not report here)

File and symbol names (kebab-case, suffixes, `use` prefix as a *name*) ·
folder placement (`hooks/`, `utils/`, `components/`, `contexts/state/`,
`values/`) · props / styles *file location* · layer boundaries and mappers ·
where side effects live (view-model vs screen) and where data is fetched
(gateway), including write requests via `toDataModel` · form artifacts and
schema file location · `values/` (screen texts, `strings.common.empty`,
`regex`, `dates`) · navigation file structure and `ParamList` location ·
public API surface · splitting a large screen / component and deciding what moves to a hook, util or view-model (`screen-decomposition-conventions` + Refactor Reviewer agent). Hardcoded colors are reported **here** (`conv-design-tokens`:
`canvasTheme` first, `values/colors.ts` as fallback).
Dates: *which* API and date correctness are reported **here** (`date-*`); the
*location* of formats / `Intl` options, locale and time zone (`values/dates.ts`)
is architecture `values-conventions`.
