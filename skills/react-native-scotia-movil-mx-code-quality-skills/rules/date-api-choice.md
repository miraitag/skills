---
title: Date for instants and math, Intl.DateTimeFormat for text the user reads
impact: HIGH
impactDescription: localized, time-zone aware dates without hand-built strings
tags: dates, Date, Intl.DateTimeFormat, toLocaleDateString, formatting, getMonth, padStart
---

## Date for instants and math, `Intl.DateTimeFormat` for text

**Impact: HIGH**

Decision guide — evaluate each finding against it, it is not a blind rewrite:

| Need | Use | Not |
| --- | --- | --- |
| Store, compare, add/subtract, send an instant | `Date` (`getTime()`, ISO string to the API) | formatted strings |
| Show a date / time to the user | `Intl.DateTimeFormat(dates.locale, options).format(date)` | `getDate() + '/' + (getMonth() + 1)…`, `padStart`, month-name arrays |
| A layout `DD/MM/YYYY` | the same formatter with `{ day: '2-digit', month: '2-digit', year: 'numeric' }` (es-MX → `04/10/2026`) | string concatenation |
| Pieces in separate components (day big, month small) | `formatter.formatToParts(date)` | `getDate()` + a month-name array |
| One isolated label | `date.toLocaleDateString(dates.locale, options)` is acceptable | — |
| "hace 3 días", "ayer" | `date-relative-time` | — |

Hand-built strings ignore locale and time zone, duplicate month names that the
platform already has and break when the copy changes. `toDateString()`,
`toUTCString()` and `toString()` are debug formats, never UI text.

**Keep `Date` (justified)** when the value is a transport format (an API field
`YYYY-MM-DD` built in a data-layer helper such as `toApiDate`, a file name, a
cache key): that is not user text. Mark it `Keep` in the evaluation table. The
scanner does not report manual formatting inside the data layer.

**Incorrect:**

```ts
const MONTHS = ['Ene', 'Feb', 'Mar' /* … */];                          // ❌ month names by hand
const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;           // ❌ manual layout
const shortDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`; // ❌
<CanvasText>{date.toDateString()}</CanvasText>                         // ❌ debug format
```

**Correct:**

```ts
// values/dates.ts  (location: architecture `values-conventions`)
export const dates = {
  formats: {
    dayMonth: { day: 'numeric', month: 'short' },
    shortDate: { day: '2-digit', month: '2-digit', year: 'numeric' },
  } satisfies Record<string, Intl.DateTimeFormatOptions>,
  locale: 'es-MX',
  timeZone: 'America/Mexico_City',
};

// screens/transfer-detail/utils/transfer-detail.utils.ts  (params: transfer-detail.utils-params.ts)
const shortDateFormatter = new Intl.DateTimeFormat(dates.locale, {
  ...dates.formats.shortDate,
  timeZone: dates.timeZone,
});

export const formatShortDate = ({ date }: TransferDetailUtilsParams.FormatShortDate): string =>
  shortDateFormatter.format(date); // ✅ "04/10/2026"
```

Hermes ships `Intl.DateTimeFormat` (with `timeZone`) on Android and iOS in
current React Native versions. On RN < 0.70, or when using `formatToParts`,
verify it on both platforms before applying.

**Detection:** `node <skill>/scripts/scan.mjs --rule=date-api-choice`
(two or more date getters in one expression, `padStart` next to date getters,
month / weekday name arrays, `toDateString` / `toUTCString` / `toGMTString`).

**Correction:**

1. Classify the value: user text → formatter; transport → keep `Date` / ISO.
2. Add the options to `values/dates.ts` (`dates.formats.<name>`).
3. Create the formatter once (module scope of the util, see
   `date-formatter-reuse`) and replace the manual string.
4. Delete month / weekday arrays that become unused.
5. `<typecheck_cmd>`.

Reference: [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
