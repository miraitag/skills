---
title: Focus effects — useFocusEffect with useCallback, useIsFocused only for rendering
impact: HIGH
impactDescription: avoids effects that re-run on every render and screens that re-render on every focus change
tags: state, hooks, navigation, useFocusEffect, useIsFocused, focus, react-navigation
---

## Focus effects — `useFocusEffect` with `useCallback`, `useIsFocused` only for rendering

**Impact: HIGH**

Screens in a stack stay **mounted** when another screen is pushed on top, so
`useEffect` does not re-run when the user comes back. React Navigation offers two
tools, and each one has a single job:

| Need | Tool | Why |
| --- | --- | --- |
| Run work when the screen gains focus and stop it when it loses focus (refresh data, analytics context, subscriptions, `BackHandler`) | `useFocusEffect(useCallback(() => { …; return cleanup; }, [deps]))` | Runs on focus, cleans up on blur; no extra renders |
| Render something differently while focused (pause a video, hide a camera preview) | `useIsFocused()` | Re-renders the screen on every focus change — only worth it when the UI depends on it |

> **Scope:** choosing the focus API and memoizing its callback. Cleanup of what
> the callback starts is `state-useeffect-cleanup`; completeness of the
> `useCallback` dependencies is `state-hook-dependencies`.

**Incorrect:**

```tsx
// ❌ inline callback: a new function every render → the effect re-subscribes every render
useFocusEffect(() => {
  const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
  return () => subscription.remove();
});

// ❌ useIsFocused only to trigger an effect: the whole screen re-renders on focus/blur
const isFocused = useIsFocused();
useEffect(() => {
  if (isFocused) {
    behavioralInsightsContract.changeContext(strings.analytics.paymentContext);
  }
}, [behavioralInsightsContract, isFocused]);
```

**Correct:**

```tsx
useFocusEffect(
  useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => subscription.remove(); // ✅ removed on blur
  }, [onBack])
);

useFocusEffect(
  useCallback(() => {
    behavioralInsightsContract.changeContext(strings.analytics.paymentContext); // ✅ no re-render
  }, [behavioralInsightsContract])
);

// ✅ useIsFocused when the rendered output depends on focus
const isFocused = useIsFocused();
return isFocused ? <CameraPreview /> : null;
```

**Rules:**

1. Always pass `useFocusEffect` a memoized callback (`useCallback`).
2. Use `useIsFocused` only when the JSX depends on the focus state; for side
   effects use `useFocusEffect`.
3. Everything started on focus is stopped in the returned cleanup.

**Detection:** `node <skill>/scripts/scan.mjs --rule=state-focus-effect`.

Reference: [useFocusEffect — React Navigation](https://reactnavigation.org/docs/use-focus-effect)
