---
title: Parse API dates once, explicitly, at the data boundary
impact: CRITICAL
impactDescription: prevents dates shown one day early and Invalid Date on Hermes
tags: dates, parsing, new Date, Date.parse, ISO 8601, UTC, hermes, toDomainModel
---

## Parse dates once, explicitly

**Impact: CRITICAL**

`new Date(string)` behaves differently depending on the string:

| String from the API | `new Date(value)` | Effect in Mexico (UTC-6) |
| --- | --- | --- |
| `'2026-10-04'` (date only) | **UTC** midnight | shows **3 Oct** ❌ |
| `'2026-10-04T10:00:00Z'` / `…-06:00` | exact instant | ✅ |
| `'2026-10-04T10:00:00'` (no offset) | local time per spec, engines have differed | confirm with backend |
| `'04/10/2026'`, `'2026/10/04'`, `'Oct 4 2026'` | not ISO: engine-dependent, `Invalid Date` on Hermes | ❌ |

`Date.parse(value)` has the same problems. `new Date(year, month, day)` takes a
**0-based** month.

Rules:

1. Parse in the data layer, once, inside `toDomainModel`; domain and UI receive
   a `Date` (or an already-validated value), never re-parse strings.
2. Date-only strings → a local date built from its parts
   (`new Date(year, month - 1, day)`) using `regex.isoDate` from
   `values/regex.ts`.
3. Date-time strings must carry `Z` or an offset; if the API omits it, agree
   the zone with backend and parse explicitly.
4. Invalid input → handle it (`Number.isNaN(date.getTime())`), never render
   `Invalid Date`.

**Incorrect:**

```ts
const date = new Date(response.operation_date);  // ❌ '2026-10-04' → 3 Oct in Mexico
const birthday = new Date('04/10/2026');          // ❌ non-ISO → Invalid Date on Hermes
const due = new Date(year, month, day);           // ❌ month from the API is 1-based
```

**Correct:**

```ts
// data/api/mapper/transfer.mapper.ts
const toLocalDate = (value: string): Date | undefined => {
  const match = regex.isoDate.exec(value); // values/regex.ts: /^(\d{4})-(\d{2})-(\d{2})$/
  if (!match) return undefined;
  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day); // ✅ local calendar date
};

export const TransferMapper = {
  toDomainModel({ amount, operation_date }: TransferDataModel.Response.Payload): TransferDomainModel {
    return { amount, operationDate: toLocalDate(operation_date) };
  },
};
```

**Detection:** `node <skill>/scripts/scan.mjs --rule=date-parsing`
(`new Date('…')` with a date-only or non-ISO literal; `Date.parse(`;
`new Date(<string value>)` whose name ends in `date` / `Date` / `At` / `fecha`
(heuristic: confirm the type); `new Date(y, month, d)` without `- 1`).

**Correction:**

1. Confirm the real format with the data model / API contract.
2. Move parsing into the data mapper with an explicit helper.
3. `<typecheck_cmd>`.
