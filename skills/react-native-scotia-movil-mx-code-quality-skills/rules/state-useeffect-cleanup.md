---
title: Effects with Dependencies and Cleanup (useEffect, useLayoutEffect, useFocusEffect)
impact: HIGH
impactDescription: prevents memory leaks, socket leaks, hanging timers, and zombie listeners
tags: state, hooks, useEffect, dependencies, cleanup, memory-leak, AbortController
---

## Effects with Dependencies and Cleanup

**Impact: HIGH**

> **Scope:** every effect hook — `useEffect`, `useLayoutEffect` and the callback
> of `useFocusEffect`: cleanup of timers, listeners, subscriptions, requests and
> animations; cancellation of state updates that happen after an `await` /
> `.then`; and effects with no dependency array at all. Incomplete dependency
> lists → `state-hook-dependencies`; syncing props/state through an effect →
> `state-derived-state`; `useFocusEffect` / `useIsFocused` usage →
> `state-focus-effect`.

Three critical `useEffect` mistakes: omitting the dependency array (runs on every
render), omitting referenced variables (stale closure), and failing to return a
cleanup function for subscriptions, network requests, or timers (memory leak).


**Incorrect (no deps, no network cancellation, no cleanup):**

```tsx
useEffect(() => {
  // ❌ No cancellation: network socket and memory remain active after unmount
  fetch(`https://api.example.com/users/${userId}`)
    .then((r) => r.json())
    .then((data) => setStatus(data.status));

  // ❌ Interval without cleanup → leaks memory and runs forever
  const interval = setInterval(() => setStatus('polling'), 5000);
  // No return cleanup!
}); // ❌ Missing dependency array → runs on EVERY render
```

**Correct (AbortController, native subscription, timer cleanup):**

```tsx
useEffect(() => {
  // ✅ 1. Real network cancellation via AbortController (frees mobile radio & socket)
  const controller = new AbortController();

  fetch(`https://api.example.com/users/${userId}`, {
    signal: controller.signal,
  })
    .then((r) => r.json())
    .then((data: { status: string }) => setStatus(data.status))
    .catch((err) => {
      // AbortError is expected when component unmounts; ignore or handle cleanly
      if (err.name !== 'AbortError') setStatus('error');
    });

  // ✅ 2. Timers must be stored and cleared
  const interval = setInterval(() => setStatus('connected'), 5000);

  // ✅ 3. Native event listeners (AppState, BackHandler, etc.)
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') setStatus('active');
  });

  // ✅ Cleanup function: executed on unmount or before running the effect again
  return () => {
    controller.abort(); // Cancels the in-flight HTTP request
    clearInterval(interval); // Destroys the timer
    subscription.remove(); // Removes native event listener
  };
}, [userId]); // ✅ Complete dependencies
```

**Correct (animation / loop cleanup in UI components):**

```tsx
// Clear an animation loop on unmount or when dimensions change
useEffect(() => {
  const animation = Animated.loop(/* ... */);
  animation.start();
  return () => animation.stop(); // ✅ mandatory cleanup
}, [containerWidth]);
```

**Async work inside an effect must be cancellable.** A `setState` after an
`await` or inside `.then` runs even if the screen was unmounted or the inputs
changed (a newer request already started): the UI shows stale data and the
closure keeps the component's memory alive until the promise settles. Guard it
with an `AbortController` (network) or a `cancelled` flag, and flip it in the
cleanup.

**Incorrect (state set after await, no guard):**

```tsx
useEffect(() => {
  const load = async () => {
    const result = await accountsGateway.getAccounts(); // ❌ may resolve after unmount
    setAccounts(result.value.map(AccountMapper.toUiModel));
  };
  load();
}, [accountsGateway]);
```

**Correct (cancellation flag flipped in the cleanup):**

```tsx
useEffect(() => {
  let cancelled = false;
  const load = async () => {
    const result = await accountsGateway.getAccounts();
    if (!cancelled && result.isSuccess) {
      setAccounts(result.value.map(AccountMapper.toUiModel)); // ✅ only while mounted and current
    }
  };
  load();
  return () => {
    cancelled = true; // ✅ ignores late results
  };
}, [accountsGateway]);
```

The same applies to `useLayoutEffect` (measurements, `requestAnimationFrame`)
and to the callback of `useFocusEffect`, which runs on **every** focus: anything
it starts must be stopped in the returned cleanup, or each visit to the screen
adds another timer / listener.

**In this repo:** UI libraries and screens frequently manage timers, native
listeners (`AppState`, keyboard listeners) or animations (`Animated` /
`react-native-reanimated`). Always return cleanup for every timer, listener, and
animation to avoid retaining detached views in Hermes memory.

Reference: [useEffect — React Docs](https://react.dev/reference/react/useEffect)
