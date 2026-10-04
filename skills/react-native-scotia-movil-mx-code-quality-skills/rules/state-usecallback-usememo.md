---
title: useCallback and useMemo
impact: HIGH
impactDescription: removes unnecessary re-renders in memoized children
tags: state, hooks, useCallback, useMemo, memo, performance
---

## useCallback and useMemo

**Impact: HIGH**

> **Scope:** when `useCallback` / `useMemo` pay off. Whether a child should be
> wrapped in `memo` → `perf-react-memo`.

`useCallback` stabilizes function references so they can be passed to children
wrapped in `React.memo`. `useMemo` memoizes expensive computations. **Critical
rule:** without `React.memo` on the child, `useCallback` provides no benefit.

**Incorrect (no memo, no useCallback, computation on every render):**

```tsx
// ❌ Without React.memo: re-renders even when its props don't change
const TaxButton = ({ onToggle, rate }: Readonly<Props>) => (
  <Pressable onPress={onToggle}>
    <CanvasText>VAT: {(rate * 100).toFixed(0)}%</CanvasText>
  </Pressable>
);

const PriceCalculator = ({ items }: Readonly<Props>) => {
  // ❌ New reference on every render → memo (if any) is nullified
  const handleToggleTax = () => setTaxRate((r) => (r === 0.16 ? 0 : 0.16));

  // ❌ Recomputed on every render even when items hasn't changed
  const total = items.reduce((sum, i) => sum + i.price * (1 + taxRate), 0);
  // ...
};
```

**Correct (memo + useCallback + useMemo with explicit generic):**

```tsx
// ✅ memo: only re-renders if rate or onToggle change
const TaxButton = memo(({ onToggle, rate }: Readonly<Props>) => (
  <Pressable onPress={onToggle} style={styles.btn}>
    <CanvasText>VAT: {(rate * 100).toFixed(0)}%</CanvasText>
  </Pressable>
));

const PriceCalculator = ({ items }: Readonly<Props>) => {
  const [taxRate, setTaxRate] = useState(0.16);

  // ✅ useCallback: stable reference → TaxButton does not re-render
  const handleToggleTax = useCallback(() => {
    setTaxRate((r) => (r === 0.16 ? 0 : 0.16));
  }, []); // setTaxRate is always stable: empty deps are correct

  // ✅ useMemo<T>: recomputes only when items or taxRate change
  const total = useMemo<number>(
    () => items.reduce((sum, i) => sum + i.price * (1 + taxRate), 0),
    [items, taxRate]
  );
  // ...
};
```

**Practical rule:** Does the function get passed as a prop to a child wrapped in `memo`? → `useCallback`.
No memoized child? → plain function, `useCallback` is overhead.

**In this repo:** this pattern is used with an **explicit generic** in
[DataList.tsx](src/scotia-lego-ui/src/components/dataList/DataList.tsx)
(`useMemo<DataListEntry[]>` and `useCallback<ListRenderItem<DataListEntry>>` for
the `renderItem`), in
[CanvasTextField.tsx](src/canvas-core/src/canvas-core/components/inputs/canvasTextField/CanvasTextField.tsx)
(`useMemo` for the border color), and in
[useCollapsible.tsx](src/scotia-lego-ui/src/components/collapsible/hooks/useCollapsible.tsx)
(`useCallback` with a functional setter).

Reference: [useCallback — React Docs](https://react.dev/reference/react/useCallback)
