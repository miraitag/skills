---
title: One date library at most, and Intl before a library
impact: MEDIUM
impactDescription: smaller bundle, one way of formatting and no deprecated Moment
tags: dates, moment, dayjs, luxon, date-fns, bundle, dependencies, Intl
---

## One date library at most, and `Intl` first

**Impact: MEDIUM**

| Situation | Decision |
| --- | --- |
| `moment` / `moment-timezone` | in maintenance mode, large and mutable: no new usages; migrate formatting to `Intl.DateTimeFormat` and math to native or `date-fns` |
| Two or more of `moment`, `dayjs`, `luxon`, `date-fns` | choose one with the team; migrate the rest |
| `format(date, 'dd/MM/yyyy')` (date-fns / dayjs) for **UI text** | evaluate `Intl.DateTimeFormat` with `dates.formats.*`: localized and no locale import |
| `date-fns` for calendar math (`addMonths`, `differenceInCalendarDays`, `isSameDay`) | ✅ keep (tree-shakable) |
| Library pattern for an **API** value (`yyyy-MM-dd`) | ✅ keep, it is a transport format (data layer) |

The decision is per usage and goes in the evaluation table: `Intl` / `keep
library` / `migrate`.

**Incorrect:**

```ts
import moment from 'moment';                                // ❌ deprecated library
const label = moment(date).format('DD [de] MMMM');          // ❌ UI text via pattern
```

**Correct:**

```ts
const dayMonthFormatter = new Intl.DateTimeFormat(dates.locale, dates.formats.dayMonthLong); // ✅ "4 de octubre"
const label = dayMonthFormatter.format(date);
const nextDate = addMonths(date, 1);                        // ✅ date-fns for math
```

**Detection:** `node <skill>/scripts/scan.mjs --rule=date-library`
(`moment` in `package.json` or imports; more than one date library in
`package.json`; date-fns / dayjs `format(` in presentation files — heuristic,
confirm that it is UI text).

**Correction:**

1. Agree the target with the team (record exceptions in the baseline).
2. Migrate usage by usage; remove the dependency when unused.
3. `<typecheck_cmd>`.
