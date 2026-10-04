---
title: Calendar math and comparisons without milliseconds tricks
impact: HIGH
impactDescription: correct day differences, month additions and equality checks
tags: dates, arithmetic, 86400000, getTime, setMonth, differenceInCalendarDays, date-fns, comparison
---

## Calendar math and comparisons

**Impact: HIGH**

| Need | Do | Not |
| --- | --- | --- |
| Same instant | `a.getTime() === b.getTime()` | `a === b` (compares references, always `false`) |
| Before / after | `a.getTime() < b.getTime()` | string comparison of formatted dates |
| Same calendar day | `isSameDay(a, b)` (date-fns) or compare `getFullYear` / `getMonth` / `getDate` | `Math.floor(ms / 86400000)` |
| Add N days | `addDays(date, n)` or `new Date(y, m, d + n)` | `date.getTime() + n * 86400000` |
| Add months | `addMonths(date, n)` (clamps 31 Jan → 28/29 Feb) | `setMonth(getMonth() + n)` (31 Jan → 3 Mar) |
| Days between dates | `differenceInCalendarDays(a, b)` | `(a - b) / (1000 * 60 * 60 * 24)` |
| Year | `getFullYear()` | `getYear()` (deprecated, years since 1900) |

A day is not always 86 400 000 ms (DST in border zones and abroad), and a
millisecond difference between `10:00` and `09:00` of the next day is less than
one day although they are different calendar days.

Use `date-fns` only if it is already a dependency or the team accepts it
(`date-library`); otherwise the native constructor with parts
(`new Date(year, month, day + n)`) normalizes overflow correctly for days.
The constant `MS_PER_DAY` does not fix the problem: the arithmetic itself is
the finding.

**Incorrect:**

```ts
if (startDate === endDate) { … }                                  // ❌ reference comparison
const tomorrow = new Date(today.getTime() + 86400000);           // ❌
const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)); // ❌
nextPayment.setMonth(nextPayment.getMonth() + 1);                 // ❌ month overflow
```

**Correct:**

```ts
if (startDate.getTime() === endDate.getTime()) { … }                         // ✅
const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); // ✅
const days = differenceInCalendarDays(end, start);                           // ✅ date-fns
const nextPaymentDate = addMonths(nextPayment, 1);                           // ✅ clamps month end
```

**Detection:** `node <skill>/scripts/scan.mjs --rule=date-arithmetic-comparison`
(`86400000`, `864e5`, `24 * 60 * 60 * 1000` in any order; `===` / `!==`
between two date-named values; `setMonth(… getMonth() ±`; `getYear()`).

**Correction:**

1. Decide the semantic (instant vs calendar day) for each finding.
2. Replace with `getTime()` comparisons or calendar functions.
3. `<typecheck_cmd>`.
