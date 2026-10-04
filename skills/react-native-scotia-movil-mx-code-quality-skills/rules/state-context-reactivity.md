---
title: Reactive Context state in the Provider
impact: HIGH
impactDescription: prevents mutable stores inside context that never trigger React re-renders
tags: state, hooks, context, provider, useState, useReducer, reactivity
---

## Reactive Context state in the Provider

**Impact: HIGH**

> **Scope:** this rule owns *reactivity* (the value crossing the context is
> React state). *Who owns* the state (provider vs host injection, never both)
> and where the contract lives is the architecture rule
> `contexts-state-conventions`.

When Context API replaces Redux or Zustand, the Context boundary must still
expose a reactive source of truth backed by React state with `useState` or
`useReducer`, whether that state is created inside the Provider or injected by a
host app. Storing a
mutable class instance or plain mutable object inside a memoized context value
breaks React reactivity: consumers can call setters, but no re-render happens.

**Incorrect (mutable store hidden inside context):**

```tsx
interface RechargeStore {
  getState: () => RechargeState;
  setState: (patch: Partial<RechargeState>) => void;
}

class RechargeStoreImpl implements RechargeStore {
  private state: RechargeState = INITIAL_RECHARGE_STATE;

  setState = (patch: Partial<RechargeState>) => {
    this.state = { ...this.state, ...patch };
  };

  getState = () => this.state;
}

const MobileTopUpProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useMemo(
    () => ({
      rechargeStore: new RechargeStoreImpl(),
    }),
    []
  );

  return <MobileTopUpContext.Provider value={value}>{children}</MobileTopUpContext.Provider>;
};
```

**Why this fails:** `setState` mutates a class field, but React never sees a
state transition. Components that already rendered using `getState()` remain
stale unless some unrelated render happens.

**Correct (reactive snapshot + actions):**

```tsx
interface RechargeState {
  alias: string;
  amount: number;
}

interface RechargeContextValue {
  clearRechargeState: () => void;
  rechargeState: RechargeState;
  setRechargeState: (patch: Partial<RechargeState>) => void;
}

const INITIAL_RECHARGE_STATE: RechargeState = {
  alias: strings.common.empty,
  amount: 0,
};

const MobileTopUpProvider = ({ children }: { children: React.ReactNode }) => {
  const [rechargeState, setRechargeStateValue] = useState(INITIAL_RECHARGE_STATE);

  const setRechargeState = useCallback((patch: Partial<RechargeState>) => {
    setRechargeStateValue((current) => ({ ...current, ...patch }));
  }, []);

  const clearRechargeState = useCallback(() => {
    setRechargeStateValue(INITIAL_RECHARGE_STATE);
  }, []);

  const value = useMemo(
    () => ({
      rechargeState,
      setRechargeState,
      clearRechargeState,
    }),
    [rechargeState, setRechargeState, clearRechargeState]
  );

  return <MobileTopUpContext.Provider value={value}>{children}</MobileTopUpContext.Provider>;
};
```

**What to audit in other projects:**

- The Context boundary exposes reactive state backed by `useState` or
  `useReducer`, whether owned by the provider itself or by an injected host
  implementation.
- The context exposes the current snapshot plus actions, not imperative
  `getX()` accessors for render data.
- Updates use functional setters when the next state depends on the previous
  one.
- `useMemo` stabilizes the context value, but it does not replace React state.

**In this repo:** the library already uses guarded context hooks and a memoized
provider value, and the host app can inject the state implementation. That is a
valid ownership model. The audit point is narrower: the instance crossing the
Context boundary must still behave reactively for React consumers instead of
being a mutable service-like store hidden inside the context.

Reference: [State as a Snapshot — React Docs](https://react.dev/learn/state-as-a-snapshot)
and [Scaling Up with Reducer and Context — React Docs](https://react.dev/learn/scaling-up-with-reducer-and-context).