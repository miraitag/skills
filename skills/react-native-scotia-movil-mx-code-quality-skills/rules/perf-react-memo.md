---
title: React.memo to Prevent Re-renders
impact: HIGH
impactDescription: avoids re-running expensive logic when props do not change
tags: performance, memo, re-render, memoization, React.memo
---

## React.memo to Prevent Re-renders

**Impact: HIGH**

> **Scope:** when to wrap a component in `memo`. Stabilizing the function / object
> props it receives → `state-usecallback-usememo`.

By default, when the parent re-renders, all of its children do too. `React.memo`
adds a shallow comparison of props: if they are all equal to the previous render,
React reuses the previous JSX without running the component function.

**Incorrect (no memo: re-renders on every parent change):**

```tsx
// ❌ No memo: re-renders even though 'title' never changes
const PageHeader = ({ title }: { title: string }) => {
  // Expensive logic: runs on EVERY counter tap
  console.log('PageHeader render');
  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>{title}</Text>
    </View>
  );
};

const Screen = () => {
  const [count, setCount] = useState(0);
  // Every count change → PageHeader re-renders
  return (
    <View>
      <PageHeader title="My Application" />
      <Text>{count}</Text>
      <Pressable onPress={() => setCount((c) => c + 1)}>
        <Text>+</Text>
      </Pressable>
    </View>
  );
};
```

**Correct (memo: only re-renders if title changes):**

```tsx
// ✅ memo: React reuses the previous JSX if title does not change
const PageHeader = memo(({ title }: { title: string }) => {
  console.log('PageHeader render — only if title changes');
  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>{title}</Text>
    </View>
  );
});

// ✅ For custom comparison (deep equality, etc.):
// memo(Component, (prev, next) => prev.title === next.title)
```

**Note:** `memo` is most effective combined with `useCallback` for function
props, since functions would otherwise always have a different reference.

**In this repo:** `memo` is applied to components that re-render frequently or
inside lists — for example
[BaseModal.tsx](src/canvas-core/src/canvas-core/components/overlay/baseModal/BaseModal.tsx),
[CanvasModalAlert.tsx](src/canvas-core/src/canvas-core/components/overlay/canvasModelAlert/CanvasModalAlert.tsx)
and [CollapsibleRow.tsx](src/scotia-lego-ui/src/components/collapsible/components/CollapsibleRow/CollapsibleRow.tsx),
always with props typed as `Readonly<Props>`.

Reference: [memo — React Docs](https://react.dev/reference/react/memo)
