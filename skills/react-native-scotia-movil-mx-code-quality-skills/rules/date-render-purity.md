---
title: Read "now" outside render
impact: MEDIUM
impactDescription: stable renders, testable logic and no stale "today"
tags: dates, new Date, Date.now, render, useState, useMemo, view-model
---

## Read "now" outside render

**Impact: MEDIUM**

`new Date()` / `Date.now()` in the body of a component or inside JSX returns a
different value on every render: memoized children re-render, values flicker
across a day boundary and the logic cannot be tested with a fixed date.

| Need | Where |
| --- | --- |
| "today" for a screen | the view-model computes it once (`useState(() => new Date())`) or the mapper receives it as a parameter |
| Elapsed time / countdown | an interval in an effect with cleanup (`state-useeffect-cleanup`) |
| Timestamp of an action | inside the handler (`onPress`), not at render |
| Initial state | lazy initializer `useState(() => new Date())`, not `useState(new Date())` |

**Incorrect:**

```tsx
const TransferSummary = ({ transfer }: TransferSummaryProps) => {
  const today = new Date();                                    // ❌ new value each render
  const isOverdue = transfer.dueDate.getTime() < Date.now();   // ❌ impure render
  return <CanvasText>{new Date().getFullYear()}</CanvasText>;  // ❌ in JSX
};
const [selectedDate, setSelectedDate] = useState(new Date());  // ❌ built every render
```

**Correct:**

```ts
// transfer-summary.view-model.ts
const [today] = useState(() => new Date());                                         // ✅ once
const summary = useMemo(() => TransferSummaryMapper.toUiModel({ today, transfer }), [today, transfer]); // ✅
```

**Detection:** `node <skill>/scripts/scan.mjs --rule=date-render-purity`
(heuristic, `.tsx` and view-models: `new Date()` / `Date.now()` in JSX lines,
as a direct `useState(` argument, or assigned at the top level of a component).

**Correction:**

1. Move "now" to the view-model / handler / lazy initializer.
2. Pass it as a parameter to mappers and utils (testable).
3. `<typecheck_cmd>`.
