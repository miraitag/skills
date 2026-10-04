---
title: Custom Hook — useApi<T>
impact: MEDIUM
impactDescription: removes duplicated fetch logic across multiple components
tags: state, hooks, custom-hook, fetch, generic, reusable
---

## Custom Hook — useApi<T>

**Impact: MEDIUM**

> **Scope:** extracting stateful logic that is *duplicated across components*
> into one reusable hook. Decomposing a single large screen / component (what
> moves to a hook, util or view-model for readability) is the architecture rule
> `screen-decomposition-conventions`; the hook's name, folder and extension are
> `hooks-conventions`.

Custom hooks extract stateful logic with repetitive side effects.
`useApi<T>` encapsulates fetch + loading + error + cancellation once, and any
component reuses it with full typing.

**Incorrect (logic duplicated in every component):**

```tsx
// ❌ This block gets copy-pasted into UserProfile, ProductList, OrderHistory...
const UserProfile = ({ userId }: Props) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/users/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        setUser(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [userId]);
  // ...
};
```

**Correct (reusable generic hook):**

```tsx
type ApiState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

function useApi<T>(url: string) {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });

  const refetch = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<T>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data });
      })
      .catch((e) => {
        if (!cancelled) setState({ status: 'error', message: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => refetch(), [refetch]);

  return { state, refetch };
}

// Usage — TypeScript infers that data is User
interface User {
  email: string;
  id: number;
  name: string;
}

const UserProfile = ({ userId }: Props) => {
  const { state, refetch } = useApi<User>(`/users/${userId}`);
  if (state.status === 'loading') return <ActivityIndicator />;
  if (state.status === 'error') return <CanvasText>{state.message}</CanvasText>;
  return <CanvasText>{state.data.name}</CanvasText>;
};
```

**In this repo:** since it is a UI library there are no fetch hooks, but the
same principle applies of extracting reusable logic into a custom hook with the
`use` prefix inside a `hooks/` folder — for example
[useCollapsible.tsx](src/scotia-lego-ui/src/components/collapsible/hooks/useCollapsible.tsx)
(state + `useCallback`) or
[useCanvasCoreTheme](src/canvas-core/src/canvas-core/theme/CanvasThemeContext.tsx)
(context access). Always type the hook's input/output.

Reference: [Custom Hooks — React Docs](https://react.dev/learn/reusing-logic-with-custom-hooks)
