---
title: Parallel Fetches with Promise.all
impact: HIGH
impactDescription: reduces load time from N×300ms to ~300ms for independent endpoints
tags: apis, Promise.all, parallel, performance, fetch
---

## Parallel Fetches with Promise.all

**Impact: HIGH**

> **Scope:** concurrency of independent requests. Where requests live (gateway /
> view-model) is architecture.

Sequential fetches (`await` one by one) waste time when the endpoints are
independent. With `Promise.all` they all start simultaneously and the total
time is that of the slowest one, not the sum.

**Incorrect (sequential fetches — ~900ms for 3 endpoints):**

```tsx
useEffect(() => {
  const load = async () => {
    // ❌ 300ms + 300ms + 300ms = ~900ms
    const userRes = await fetch(`/users/${userId}`);
    const user = (await userRes.json()) as User;

    const postsRes = await fetch(`/posts?userId=${userId}`);
    const posts = (await postsRes.json()) as Post[];

    const commentsRes = await fetch('/comments?_limit=5');
    const comments = (await commentsRes.json()) as Comment[];

    setUser(user);
    setPosts(posts);
    setComments(comments);
  };
  load();
}, [userId]);
```

**Correct (Promise.all — ~300ms, the max of the three):**

```tsx
useEffect(() => {
  let cancelled = false;

  // ✅ All three fetches start simultaneously
  Promise.all([
    fetch(`/users/${userId}`).then((r) => r.json() as Promise<User>),
    fetch(`/posts?userId=${userId}`).then((r) => r.json() as Promise<Post[]>),
    fetch('/comments?_limit=5').then((r) => r.json() as Promise<Comment[]>),
  ])
    .then(([user, posts, comments]) => {
      if (!cancelled)
        setState({ status: 'success', data: { user, posts, comments } });
    })
    .catch((e) => {
      if (!cancelled) setState({ status: 'error', message: e.message });
    });

  return () => {
    cancelled = true;
  };
}, [userId]);
```

**Note:** for endpoints with partial dependencies, group them in batches:
`await Promise.all([dep1, dep2])` → `await Promise.all([dep3(res1), dep4(res2)])`.

**In this repo:** the UI library does not fetch; this rule applies to the host
app or data features. Consider it when integrating the components into screens
that load information.

Reference: [Network — React Native Docs](https://reactnative.dev/docs/network)
