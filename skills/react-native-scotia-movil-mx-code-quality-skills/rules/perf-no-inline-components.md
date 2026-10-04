---
title: Do Not Define Components inside Components
impact: CRITICAL
impactDescription: prevents unmounts and remounts on every render of the parent
tags: performance, components, scope, remount, unmount
---

## Do Not Define Components inside Components

**Impact: CRITICAL — causes flickering and state loss**

When a component is defined inside another, React creates a new component type on
every render of the parent. Being a different type, React unmounts the previous
component and mounts a new one — resetting all of its internal state and running
all of its effects again.

**Incorrect (component defined inside the parent):**

```tsx
const UserProfile = ({ userId }: Props) => {
  const [tab, setTab] = useState<'info' | 'posts'>('info');

  // ❌ Avatar and Stats are NEW types on every render of UserProfile
  // → React unmounts and remounts them → internal state is lost → flickering
  const Avatar = ({ size }: { size: number }) => (
    <View style={{ width: size, height: size, borderRadius: size / 2 }}>
      <Text>{userId[0].toUpperCase()}</Text>
    </View>
  );

  const Stats = () => (
    <View style={{ flexDirection: 'row', gap: 24 }}>
      <Text>120 posts</Text>
    </View>
  );

  return (
    <View>
      <Avatar size={72} />
      <Stats />
    </View>
  );
};
```

**Correct (components extracted to module level):**

```tsx
// ✅ Stable types: React reuses the instances between parent renders
const Avatar = memo(({ initial, size }: { initial: string; size: number }) => (
  <View
    style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2 },
    ]}
  >
    <Text style={styles.avatarText}>{initial.toUpperCase()}</Text>
  </View>
));

const Stats = memo(
  ({ followers, posts }: { followers: number; posts: number }) => (
    <View style={styles.stats}>
      <Text style={styles.stat}>
        {posts} {strings.profile.posts}
      </Text>
      <Text style={styles.stat}>
        {followers.toLocaleString()} {strings.profile.followers}
      </Text>
    </View>
  )
);

// ✅ Explicit props: the component does not need to access the parent's scope
const UserProfile = ({ userId }: Props) => {
  const [tab, setTab] = useState<'info' | 'posts'>('info');
  return (
    <View>
      <Avatar initial={userId[0]} size={72} />
      <Stats posts={120} followers={3400} />
    </View>
  );
};
```

**In this repo:** subcomponents are declared at module level or in their own
file inside `components/` (for example `CollapsibleRow`, `CollapsibleItem`,
`DataListEntries`), never inside the body of the parent component. They are
memoized with `memo` and typed with `Readonly<Props>`.

Reference: [Components — React Docs](https://react.dev/learn/your-first-component#nesting-and-organizing-components)
