---
title: Async flows with try/catch and fallback UI
impact: MEDIUM
impactDescription: prevents rejected promises, hung states, and unresponsive navigation
tags: api, async, try-catch, error-handling, fallback-ui, navigation
---

## Async flows with try/catch and fallback UI

**Impact: MEDIUM**

When an `async` function controls navigation, loading state, or mutations, it
must catch failures explicitly. If a promise rejects without handling, the UI
can freeze, lose the error state, or skip the fallback path.

**Incorrect (await without catch or fallback):**

```tsx
const handleContinue = async () => {
  const result = await executePayment(accountId, accountClabe);
  navigation.navigate(LossMitigationToolRoutes.Ticket, {
    data: buildTicket(result),
  });
};
```

**Correct (explicit catch and visible fallback):**

```tsx
const handleContinue = useCallback(async () => {
  try {
    const result = await executePayment(accountId, accountClabe);

    if (!result.success) {
      navigation.navigate(LossMitigationToolRoutes.Error, {
        error: result.error,
      });
      return;
    }

    navigation.navigate(LossMitigationToolRoutes.Ticket, {
      data: buildTicket(result),
    });
  } catch (error) {
    navigation.navigate(LossMitigationToolRoutes.Error, {
      error: normalizeError(error),
    });
  }
}, [accountClabe, accountId, executePayment, navigation]);
```

**Rules:**

1. Every `await` that affects navigation, loading state, or persistence must have `try/catch`.
2. Do not swallow errors silently: translate them into a fallback UI or a typed result.
3. If a flow cannot recover, move it to an error screen/modal or, for render errors, complement it with an `ErrorBoundary`.

**In this repo:** `payment-selector.screen.tsx` and other view models trigger
async flows that end in navigation; this rule prevents rejected promises with
no exit for the user.

Reference: [MDN — try...catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)
