---
title: Complete dependencies in hooks
impact: HIGH
impactDescription: prevents stale closures, duplicated effects, and intermittent bugs
tags: state, hooks, dependencies, useEffect, useFocusEffect, useCallback, stale-closure
---

## Complete dependencies in hooks

**Impact: HIGH**

`useEffect`, `useFocusEffect`, and `useCallback` must declare all the
variables they use. Omitting a dependency causes stale closures, inconsistent
re-executions, or behavior that only fails in certain navigation flows.

**Incorrect (incomplete or disabled deps):**

```tsx
useEffect(() => {
  getAccounts();
}, []); // ❌ getAccounts is missing

useFocusEffect(
  useCallback(() => {
    behavioralInsightsContract.changeContext('LMT_PAYMENT_TDC');
  }, []) // ❌ behavioralInsightsContract and lmtSelection are missing
);
```

**Correct (complete and stable deps):**

```tsx
useEffect(() => {
  getAccounts();
}, [getAccounts]);

useFocusEffect(
  useCallback(() => {
    switch (lmtSelection.productType) {
      case OpportunityProductType.TDC:
        behavioralInsightsContract.changeContext('LMT_PAYMENT_TDC');
        break;
      default:
        break;
    }
  }, [behavioralInsightsContract, lmtSelection.productType])
);
```

**Rules:**

1. Include every external variable used inside the hook.
2. Do not disable `react-hooks/exhaustive-deps` except with a very specific justification.
3. If a function depends on previous state, stabilize it with `useCallback` or restructure the computation.

**In this repo:** `payment-selector.screen.tsx` and other screens use
`useFocusEffect` + `useCallback`, so this check prevents silent errors in
navigation and telemetry.

Reference: [React Docs — Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
