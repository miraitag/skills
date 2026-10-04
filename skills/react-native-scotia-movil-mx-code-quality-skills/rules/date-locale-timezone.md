---
title: Explicit locale and time zone; never toISOString() as a calendar date
impact: HIGH
impactDescription: same text on every device and no day shift after 18:00 in Mexico
tags: dates, locale, timeZone, es-MX, toISOString, getTimezoneOffset, Intl
---

## Explicit locale and time zone

**Impact: HIGH**

1. **Locale is explicit and single-sourced.** `toLocaleDateString()` /
   `new Intl.DateTimeFormat()` without a locale use the **device** language
   (an English phone shows "Oct 4, 2026"). Every call passes `dates.locale`
   (`values/dates.ts`, value from `date_locale` in the profile, default
   `es-MX`). A literal `'es-MX'` / `'en-US'` scattered in code is replaced by
   `dates.locale`.
2. **Time zone is a decision.** Profile key `date_time_zone`:
   - `device` — show the user's local time (default).
   - an IANA zone (`America/Mexico_City`) — business times that must not move
     with the phone (cut-off hours, branch schedules). Then every formatter
     passes `timeZone: dates.timeZone`.
3. **`toISOString()` is UTC.** `toISOString().slice(0, 10)` / `.split('T')[0]`
   as "today's date" returns **tomorrow** after 18:00 in Mexico (UTC-6). A
   local calendar date for the API is built from the local parts
   (`getFullYear`, `getMonth() + 1`, `getDate()`) in **one** data-layer helper
   (`toApiDate`); that is a transport format, not UI text. Do not rely on
   locale tricks (`'en-CA'`, `'sv-SE'`) to get `YYYY-MM-DD`: their output has
   changed between ICU versions.
4. **No manual offsets.** `getTimezoneOffset()` arithmetic breaks with DST
   (border zones, users abroad); use the `timeZone` option.

**Incorrect:**

```ts
date.toLocaleDateString();                                    // ❌ device locale
new Intl.DateTimeFormat('es-MX', dates.formats.shortDate);   // ❌ literal locale
const today = new Date().toISOString().split('T')[0];        // ❌ UTC: next day after 18:00
const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); // ❌ manual offset
```

**Correct:**

```ts
// values/dates.ts
export const dates = {
  formats: { shortDate: { day: '2-digit', month: '2-digit', year: 'numeric' } },
  locale: 'es-MX',
  timeZone: 'America/Mexico_City',
};

new Intl.DateTimeFormat(dates.locale, { ...dates.formats.shortDate, timeZone: dates.timeZone }); // ✅

// data/api/mapper/transfer.mapper.ts — transport format, built from local parts
const toApiDate = (date: Date): string =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-'); // ✅ '2026-10-04' at 23:00 in Mexico
```

**Detection:** `node <skill>/scripts/scan.mjs --rule=date-locale-timezone`
(`toLocale*String()` without arguments or with `undefined`; `Intl.DateTimeFormat()` /
`(undefined` / `([]`; locale literals in date calls; `toISOString()` followed
by `split('T')` / `slice(0, 10)` / `substring(0, 10)`; `getTimezoneOffset()`).

**Correction:**

1. Add `locale` / `timeZone` to `values/dates.ts` (create the file if missing).
2. Pass them to every formatter; replace UTC slicing by a local formatter.
3. `<typecheck_cmd>`.
