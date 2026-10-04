---
title: Typed useState and Functional Setter
impact: HIGH
impactDescription: prevents stale state and guarantees type safety in future assignments
tags: state, hooks, useState, functional-setter, stale-state
---

## Typed useState and Functional Setter

**Impact: HIGH**

`useState<T>` accepts a generic type that TypeScript enforces on every
assignment. The functional setter `setState(prev => prev + 1)` guarantees that
concurrent operations always use the most recent value — without it, two calls in
the same batch may read the same stale value.

**Incorrect (no type, direct setter with stale state):**

```tsx
// ❌ No generic: TypeScript infers null, not Settings | null
const [settings, setSettings] = useState(null);

// ❌ Direct setter: both calls read count=0 → result 1, not 2
const doubleIncrement = () => {
  setCount(count + 1); // reads count=0 → sets 1
  setCount(count + 1); // reads count=0 → sets 1 AGAIN
};
```

**Correct (explicit generic + functional setter):**

```tsx
interface Settings {
  darkMode: boolean;
  fontSize: number;
}

// ✅ Explicit generic
const [settings, setSettings] = useState<Settings | null>(null);
const [count, setCount] = useState<number>(0);

// ✅ Functional setter: prev is always the most recent value
const doubleIncrement = () => {
  setCount((prev) => prev + 1); // prev=0 → result 1
  setCount((prev) => prev + 1); // prev=1 → result 2 ✅
};

// ✅ TypeScript validates the assigned object
const loadDefaults = () => {
  setSettings({ darkMode: false, fontSize: 16 }); // ✅ Correct type
};
```

**In this repo:** the generic is used **only when the type is not inferable** or
is broader than the initial value — for example
`useState<Set<string>>(new Set())` in
[useCollapsible.tsx](src/scotia-lego-ui/src/components/collapsible/hooks/useCollapsible.tsx),
which also uses a functional setter (`setExpandedIds(prevIds => ...)`). When the
initial value already defines the type, the generic is omitted (`useState(false)`,
`useState(textFieldParams.value)` in
[CanvasTextField.tsx](src/canvas-core/src/canvas-core/components/inputs/canvasTextField/CanvasTextField.tsx)).

Reference: [useState — React Docs](https://react.dev/reference/react/useState)
