---
title: Typed useRef — Components and Persistent Values
impact: MEDIUM
impactDescription: avoids unnecessary re-renders for values that don't need to update the UI
tags: state, hooks, useRef, focus, timer, imperative
---

## Typed useRef — Components and Persistent Values

**Impact: MEDIUM**

`useRef` has two uses: a reference to a native component (for `.focus()`,
`.blur()`) and a persistent mutable value that does NOT trigger re-renders
(timers, IDs). Using `useState` for values that don't need to update the UI is a
performance mistake.

**Incorrect (useState for timer, no ref for input):**

```tsx
// ❌ useState for timer: unnecessary re-render + possible stale closure
const [timerId, setTimerId] = useState<ReturnType<typeof setTimeout> | null>(
  null
);

// ❌ No ref to the TextInput: we can't call .focus() or .blur()
const handleChange = (text: string) => {
  if (timerId) clearTimeout(timerId); // ❌ timerId may be stale
  setTimerId(setTimeout(() => console.log('Search:', text), 400));
};
```

**Correct (useRef for timer and native component):**

```tsx
// ✅ useRef for the native component: enables imperative .focus()
const inputRef = useRef<TextInput>(null);

// ✅ useRef for the timer: persists across renders without re-renders
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleChange = (text: string) => {
  // ✅ timerRef.current is always up to date: no stale closure
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => onSearch(text), 400);
};

const handleClear = () => {
  setQuery(strings.common.empty);
  inputRef.current?.focus(); // ✅ Imperative focus
};
```

**Practical rule:** Does this change need to update the UI? → `useState`.
No? → `useRef`.

**Detection also flags** `useState` values that are never read, or only read
inside handlers / effects without appearing in the JSX or a dependency array:
they cause a re-render on every `set` for nothing. Remove them if unused, or
move them to `useRef` (`ref.current = value`) if they only need to persist
between renders (last selected id, a flag that a request was already sent,
the previous value of a prop).

**In this repo:** `useRef` is used, typed, for references to native components
and for mutable animation values (`useSharedValue` from Reanimated plays an
analogous role in the BottomSheet). Always type the ref (`useRef<TextInput>(null)`,
`useRef<ReturnType<typeof setTimeout> | null>(null)`).

Reference: [useRef — React Docs](https://react.dev/reference/react/useRef)
