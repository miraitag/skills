---
title: Relative time ("hace 3 días") with Intl.RelativeTimeFormat when available
impact: LOW
impactDescription: correct plurals and wording without hand-written thresholds
tags: dates, Intl.RelativeTimeFormat, relative, ago, hace, ayer, polyfill, hermes
---

## Relative time

**Impact: LOW**

Texts such as "hace 3 días", "ayer", "en 2 horas" built by hand repeat
plural rules and thresholds in each screen. `Intl.RelativeTimeFormat` with
`numeric: 'auto'` produces "ayer" / "hace 3 días" / "mañana" for the locale.

**Hermes does not ship `Intl.RelativeTimeFormat`** (nor `PluralRules`). Evaluate
before applying:

| Project state | Decision |
| --- | --- |
| A polyfill is installed (`@formatjs/intl-relativetimeformat`, `hermes-intl`) or the engine is JSC | `Intl.RelativeTimeFormat` |
| No polyfill | **one** helper in a util (`formatRelativeDays`) with its texts in `values/strings.ts`; never inline per screen |
| Only "hoy" / "ayer" labels | keep the helper; a polyfill is not worth it |

Day difference: compare **calendar days** (`date-arithmetic-comparison`), not
`Math.floor(ms / 86400000)`.

**Incorrect:**

```ts
const days = Math.floor((Date.now() - date.getTime()) / 86400000);   // ❌ ms day math
const label = days === 1 ? 'ayer' : `hace ${days} días`;            // ❌ inline texts and plurals
```

**Correct:**

```ts
// with a polyfill
const relativeFormatter = new Intl.RelativeTimeFormat(dates.locale, { numeric: 'auto' });
export const formatRelativeDays = ({ days }: ActivityUtilsParams.FormatRelativeDays): string =>
  relativeFormatter.format(-days, 'day'); // ✅ "ayer", "hace 3 días"

// without a polyfill — texts in values/strings.ts
export const formatRelativeDays = ({ days }: ActivityUtilsParams.FormatRelativeDays): string => {
  if (days === 0) return strings.common.today;
  if (days === 1) return strings.common.yesterday;
  return strings.common.daysAgo.replace(strings.common.countToken, String(days)); // ✅ single helper
};
```

**Detection:** `node <skill>/scripts/scan.mjs --rule=date-relative-time`
(literals / templates with `hace`, `ago`, `ayer`, `mañana`, `yesterday`,
`tomorrow` next to date code; `Intl.RelativeTimeFormat` without a polyfill in
`package.json`).

**Correction:**

1. Check `package.json` for a polyfill; decide with the table above.
2. Centralize in one util; texts to `values/strings.ts`.
3. `<typecheck_cmd>`.

Reference: [MDN Intl.RelativeTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat)
