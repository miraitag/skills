---
title: Values (colors, dimens, strings, regex, dates)
impact: MEDIUM
impactDescription: centralizes tokens, texts, patterns and formats; avoids scattered literals
tags: values, strings, colors, dimens, regex, dates, tokens, i18n
skill: values-conventions
---

## Values (tokens, texts, patterns and formats)

**Impact: MEDIUM**

Rules for `src/private/values/` (configurable per project with `values_root` in
`.scotia-audit/profile.md`).

### Structure

```
values/
├── colors.ts    # feature-only color tokens (fallback after canvasTheme)
├── dimens.ts    # dimension / spacing tokens
├── strings.ts   # every screen text + strings.common.empty
├── regex.ts     # every regular expression
└── dates.ts     # every date / time format
```

| File         | Export     | Holds                                                     | Consumed as                      |
| ------------ | ---------- | --------------------------------------------------------- | -------------------------------- |
| `colors.ts`  | `colors`   | Feature color tokens **not** available in `canvasTheme`   | `colors.transfer.highlight`      |
| `dimens.ts`  | `dimens`   | Sizes, spacing, radii specific to the feature             | `dimens.card.radius`             |
| `strings.ts` | `strings`  | Screen copy, validation messages, `common.empty`          | `strings.beneficiaries.title`    |
| `regex.ts`   | `regex`    | Regular expressions (validation, masks, parsing)          | `regex.basicPasswordRegex`       |
| `dates.ts`   | `dates`    | Date / time format patterns and `Intl` format options     | `dates.formats.shortDate`        |

### Rules

1. **One kebab-case file per value type** in `values/`, each exporting a
   constant object grouped by domain/screen:
   `export const strings = { common: { empty: '' }, beneficiaries: { … } }`.
2. **Screen texts live in `strings.ts`.** Any text the user reads on a
   screen — titles, labels, placeholders, buttons, messages, accessibility
   labels, validation messages — is consumed from `strings`, never written as a
   literal in screens, components or view-models.
   - **Exception — component configuration:** string literals that configure a
     component or select a variant are not copy and stay inline
     (`variant="primary"`, `size="small"`, `type="outlined"`, `mode="onChange"`,
     `keyboardType="numeric"`, `accessibilityRole="button"`, `testID="…"`,
     route names, icon names).
3. **Empty strings are `strings.common.empty`.** No `''` / `""` in screens,
   components, view-models, hooks, mappers or utils — including `useState('')`,
   `defaultValues` and fallbacks (`value ?? strings.common.empty`).
4. **Regular expressions live in `regex.ts`.** No regex literal (`/…/`) or
   `new RegExp('…')` with a fixed pattern outside `values/regex.ts`. Patterns
   that arrive at runtime (e.g. a field descriptor's `pattern`) are data, not
   literals, and are allowed.
5. **Date formats live in `dates.ts`.** Format strings (`'DD/MM/YYYY'`,
   `'yyyy-MM-dd'`, `'HH:mm'`) and `Intl.DateTimeFormat` / `toLocaleDateString`
   option objects are declared once in `dates` and reused.
6. **Colors:** `canvasTheme` first; `values/colors.ts` only for colors the
   design system does not provide. Detection and fixing of hardcoded colors is
   the code-quality rule `conv-design-tokens` (single owner), which uses this
   file as its fallback location.
7. **No logic in `values/`**: constant data only (no functions, no hooks).

**Incorrect:**

```tsx
// beneficiaries.screen.tsx
const [alias, setAlias] = useState('');                       // ❌ empty literal
const isValidClabe = /^\d{18}$/.test(clabe);                   // ❌ regex literal
const date = format(transfer.date, 'DD/MM/YYYY');              // ❌ date format literal
<CanvasText>Mis beneficiarios</CanvasText>                     // ❌ screen text literal
<CanvasTextField labelParams={{ text: 'Alias' }} />            // ❌ label literal
```

**Correct:**

```ts
// values/strings.ts
export const strings = {
  beneficiaries: { aliasLabel: 'Alias', title: 'Mis beneficiarios' },
  common: { empty: '' },
};

// values/regex.ts
export const regex = {
  clabe: /^\d{18}$/,
};

// values/dates.ts
export const dates = {
  formats: { shortDate: 'DD/MM/YYYY', time: 'HH:mm' },
};
```

```tsx
// beneficiaries.screen.tsx
const [alias, setAlias] = useState(strings.common.empty);       // ✅
const isValidClabe = regex.clabe.test(clabe);                   // ✅
const date = format(transfer.date, dates.formats.shortDate);    // ✅
<CanvasText>{strings.beneficiaries.title}</CanvasText>          // ✅
<CanvasTextField labelParams={{ text: strings.beneficiaries.aliasLabel }} /> // ✅
<CanvasButton variant="primary" size="small" />                 // ✅ configuration, not copy
```

**Detection:**

```bash
V=src/private/values
# Text literals in JSX children and in text props / text keys
grep -rnE ">[[:space:]]*[A-Za-zÁÉÍÓÚáéíóúñÑ¿¡][^<>{}]{2,}<" src/private --include="*.tsx" | grep -v "strings\."
grep -rnE "(title|label|text|placeholder|subtitle|description|message|errorText|helperText|accessibilityLabel|accessibilityHint)(=|:)[[:space:]]*['\"][^'\"]*[A-Za-zÁÉÍÓÚáéíóúñ]" src/private --include="*.ts*" | grep -v "^$V"
# Empty string literals
grep -rnE "''|\"\"" src/private --include="*.ts*" | grep -v "^$V"
# Regex literals / fixed RegExp outside values/regex.ts
grep -rnE "(\(|=|,|:)[[:space:]]*/[^/*[:space:]][^/]*/[dgimsuy]*[[:space:]]*[.,;)]|new RegExp\(['\"\`]" src/private --include="*.ts*" | grep -v "^$V"
# Date format literals outside values/dates.ts
grep -rnE "['\"](DD|dd|D|d)[/.-](MM|M)[/.-](YYYY|yyyy|YY|yy)['\"]|['\"](YYYY|yyyy)-(MM)-(DD|dd)['\"]|['\"](HH|hh):mm(:ss)?['\"]" src/private --include="*.ts*" | grep -v "^$V"
# Functions inside values (not allowed)
grep -rnE "=>|function" $V
```

**Correction:**

1. Move texts to `strings.ts` (grouped by screen) and consume `strings.<screen>.<key>`.
2. Replace every `''` / `""` with `strings.common.empty`.
3. Move regex literals to `regex.ts` and consume `regex.<name>`.
4. Move date formats / `Intl` options to `dates.ts` and consume `dates.<group>.<name>`.
5. Create the missing `values/*.ts` file if the project does not have it yet.
6. `pnpm typecheck` + `pnpm lint`.
