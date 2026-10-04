---
title: Typed API Consumption with States
impact: HIGH
impactDescription: eliminates crashes from null access and blank screen states
tags: apis, fetch, typed, discriminated-union, loading, error, cancellation
---

## Typed API Consumption with States

**Impact: HIGH**

> **Scope:** modeling loading / error / success and typing the response. *Where*
> the request lives (gateway implementation in `data/`, orchestration in the
> view-model) is architecture (`data-gateway-impl-conventions`,
> `presentation-view-model-conventions`). Cancellation and cleanup →
> `state-useeffect-cleanup`.

An API call has three states: loading, error, and success. Not modeling all
three produces blank screens or crashes with `null.property`. Use a discriminated
union so TypeScript guarantees safe access.

**Incorrect (no type, no loading, no error, no cancellation):**

```tsx
// ❌ user is null — user.name crashes on first render
const [user, setUser] = useState(null);

useEffect(() => {
  // ❌ No cancellation or error handling
  fetch(`/users/${userId}`)
    .then((r) => r.json())
    .then((data) => setUser(data));
}, []); // ❌ userId not in dependencies

return <Text>{user.name}</Text>; // ❌ crashes if user is null
```

**Correct (discriminated union + cancellation + three UIs):**

```tsx
interface User {
  email: string;
  id: number;
  name: string;
}

type FetchState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

const UserProfile = ({ userId }: Props) => {
  const [state, setState] = useState<FetchState<User>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetch(`/users/${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json() as Promise<User>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: err.message });
      });

    return () => {
      cancelled = true;
    }; // ✅ Cleanup
  }, [userId]); // ✅ userId in dependencies

  if (state.status === 'loading') return <ActivityIndicator />;
  if (state.status === 'error')
    return <Text style={styles.error}>{state.message}</Text>;

  // TypeScript knows state.data is User here
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{state.data.name}</Text>
      <Text style={styles.detail}>{state.data.email}</Text>
    </View>
  );
};
```

Reference: [Network — React Native Docs](https://reactnative.dev/docs/network)

**In this repo:** this UI library **does not make network calls**. This rule
applies to the host app or features that consume data; for the library's
components, the equivalent pattern is to model discriminated UI states
(`hasError`, content/`errorMessage`) as in
[DataList.tsx](src/scotia-lego-ui/src/components/dataList/DataList.tsx), using
`CanvasText` and theme tokens.
