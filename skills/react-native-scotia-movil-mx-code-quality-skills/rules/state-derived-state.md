---
title: Derived State — Compute During Render
impact: HIGH
impactDescription: removes extra renders caused by a synchronization useEffect
tags: state, hooks, derived-state, useMemo, antipattern, useEffect
---

## Derived State — Compute During Render

**Impact: HIGH**

Storing in state values that can be computed from existing state causes extra
renders and creates opportunities for them to get out of sync. If a value can be
computed with an expression, it should be computed during render, not in a
`useEffect`.

**Incorrect (redundant state + synchronization useEffect):**

```tsx
// ❌ total and itemCount can ALWAYS be computed from items
const [total, setTotal] = useState(0);
const [itemCount, setItemCount] = useState(0);

// ❌ useEffect causes 3 renders: items → total → itemCount
useEffect(() => {
  setTotal(items.reduce((sum, i) => sum + i.price * i.qty, 0));
  setItemCount(items.reduce((sum, i) => sum + i.qty, 0));
}, [items]);
```

**Correct (values derived during render):**

```tsx
// ✅ No redundant state: computed on every render — 0 extra renders
const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

// ✅ useMemo for expensive computations or creating heavy objects
const total = useMemo(
  () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
  [items]
);

const formattedTotal = useMemo(
  () =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(total),
  [total]
);
```

**Rule:** if a value can be computed with `array.reduce()` or an expression
from props/state, it must not be stored in state.

**In this repo:** derived values are computed during render — for example
`hasError = Boolean(errorMessage)` and `showDividers = style !== Compact`
in [DataList.tsx](src/scotia-lego-ui/src/components/dataList/DataList.tsx), or
`hasError = Boolean(inputErrorParams?.errorText?.trim())` in
[CanvasTextField.tsx](src/canvas-core/src/canvas-core/components/inputs/canvasTextField/CanvasTextField.tsx),
with `useMemo` reserved for more expensive computations (`buildDataListEntries`).

Reference: [You Might Not Need an Effect — React Docs](https://react.dev/learn/you-might-not-need-an-effect)
