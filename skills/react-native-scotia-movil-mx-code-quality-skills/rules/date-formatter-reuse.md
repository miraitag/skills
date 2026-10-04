---
title: Create each date formatter once
impact: MEDIUM
impactDescription: avoids building an Intl formatter per render, per list item or per call
tags: dates, Intl.DateTimeFormat, toLocaleDateString, performance, FlatList, renderItem, useMemo
---

## Create each date formatter once

**Impact: MEDIUM**

Building an `Intl.DateTimeFormat` is expensive (locale data lookup);
`format()` on an existing one is cheap. `toLocaleDateString(locale, options)`
builds a new formatter internally on **every** call. Inside a render, a
`renderItem`, a `.map()` or a loop that cost is paid once per item and per
render.

| Situation | Where the formatter lives |
| --- | --- |
| Fixed locale + options | module scope of the util (`const xFormatter = new Intl.DateTimeFormat(…)`) |
| Options depend on props / state | `useMemo(() => new Intl.DateTimeFormat(…), [deps])` in the hook / view-model |
| One label, outside lists | `toLocaleDateString(dates.locale, options)` is acceptable |

Formatting for a list should happen in the mapper (`toUiModel`) so the UI
model already carries the text — the item component then renders a string.

**Incorrect:**

```tsx
const renderItem = ({ item }: ListRenderItemInfo<MovementUiModel>) => (
  <CanvasText>
    {new Intl.DateTimeFormat(dates.locale, dates.formats.shortDate).format(item.date)} {/* ❌ one formatter per item */}
  </CanvasText>
);

movements.map((movement) => movement.date.toLocaleDateString(dates.locale, dates.formats.shortDate)); // ❌
```

**Correct:**

```ts
// screens/movements/mapper/movement.mapper.ts
const shortDateFormatter = new Intl.DateTimeFormat(dates.locale, {
  ...dates.formats.shortDate,
  timeZone: dates.timeZone,
}); // ✅ once per module

export const MovementMapper = {
  toUiModel({ amount, date, id }: MovementDomainModel): MovementUiModel {
    return { amount, dateText: shortDateFormatter.format(date), id }; // ✅ text ready for the UI
  },
};
```

**Detection:** `node <skill>/scripts/scan.mjs --rule=date-formatter-reuse`
(`new Intl.DateTimeFormat(` inside a function body without `useMemo`;
`toLocale*String(` / `Intl.DateTimeFormat` inside `.map(`, `renderItem`,
`for` / `forEach`).

**Correction:**

1. Move the formatter to module scope (or `useMemo` when its options change).
2. Prefer formatting in the mapper; the UI model exposes `<field>Text`.
3. `<typecheck_cmd>`.
