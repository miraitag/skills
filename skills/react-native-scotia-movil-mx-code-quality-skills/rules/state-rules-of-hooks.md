---
title: Rules of Hooks — no conditional or looped hook calls
impact: HIGH
impactDescription: a conditional hook call corrupts React's hook order and produces state from the wrong slot
tags: state, hooks, rules-of-hooks, eslint, conditional
---

## Rules of Hooks — no conditional or looped hook calls

**Impact: HIGH**

React identifies each hook by its **call order**. A hook called inside an `if`,
a loop, after an early `return`, or inside a nested function makes that order
change between renders, so React hands state from one hook to another. The bug
is silent until a specific branch runs. `eslint-plugin-react-hooks`
(`react-hooks/rules-of-hooks`) detects it — but only inside functions whose
name starts with `use` + uppercase or with an uppercase letter (components).

> **Not here (architecture `hooks-conventions`):** the hook's *name*
> (`use<Feature>`), file name, folder and `.ts` / `.tsx` extension. This rule
> only covers how hooks are *called*.

**Incorrect:**

```tsx
const ProfileScreen = ({ userId }: Readonly<Props>) => {
  if (!userId) {
    return null; // ❌ early return BEFORE hooks: the hook count changes
  }
  const [tab, setTab] = useState<'info' | 'posts'>('info');

  if (tab === 'posts') {
    const posts = usePosts(userId); // ❌ conditional hook call
  }

  items.forEach((item) => {
    useTrack(item.id); // ❌ hook inside a loop / nested callback
  });
};
```

**Correct:**

```tsx
const ProfileScreen = ({ userId }: Readonly<Props>) => {
  // ✅ hooks always run, in the same order, at the top level
  const [tab, setTab] = useState<'info' | 'posts'>('info');
  const posts = usePosts(userId, { enabled: tab === 'posts' }); // ✅ condition passed as an argument
  useTrackMany(items.map((item) => item.id)); // ✅ one hook that handles the list

  if (!userId) return null; // ✅ early return after every hook
  return <ProfileTabs tab={tab} posts={posts} onTabChange={setTab} />;
};
```

**Rules:**

1. Call hooks only at the top level of a component or a custom hook.
2. Never call hooks inside conditions, loops, nested functions, or after an
   early `return`; move the condition *into* the hook (argument / `enabled`
   flag) or split the component.
3. Keep `react-hooks/rules-of-hooks` as `error` in ESLint and never disable it.

Reference: [Rules of Hooks — React Docs](https://react.dev/reference/rules/rules-of-hooks)
