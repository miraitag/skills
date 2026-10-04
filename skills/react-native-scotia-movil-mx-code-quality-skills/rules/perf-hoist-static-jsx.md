---
title: Hoist Static JSX out of the Component
impact: HIGH
impactDescription: avoids recreating FlatList references on every render
tags: performance, jsx, static, module, FlatList, hoist
---

## Hoist Static JSX out of the Component

**Impact: HIGH**

JSX that does not depend on props or state can be extracted to module constants.
React will reuse the same reference on every render without recomputing it. It is
especially important for `ItemSeparatorComponent` and `ListEmptyComponent` of
`FlatList`, which with new references cause FlatList to re-process.

**Incorrect (static JSX inside the component):**

```tsx
const ItemList = ({ items, loading }: Props) => {
  // ❌ New references on every render → FlatList re-processes
  const Separator = () => <View style={styles.separator} />;
  const EmptyState = () => (
    <View style={styles.empty}>
      <Text>No results</Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#38bdf8" />;
  }

  return (
    <FlatList
      data={items}
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={EmptyState}
      // ...
    />
  );
};
```

**Correct (static JSX hoisted to module level):**

```tsx
// ✅ Created ONLY ONCE when the file is imported
const Separator = () => <View style={styles.separator} />;
const EmptyState = () => (
  <View style={styles.empty}>
    <Text style={styles.emptyText}>{strings.search.noResults}</Text>
  </View>
);
// Module scope cannot call the theme hook: use the values/colors.ts fallback
const LOADER = <ActivityIndicator color={colors.common.loader} style={styles.loader} />;

const ItemList = ({ items, loading }: Props) => {
  if (loading) return LOADER; // ✅ Same element on every render

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => <Text style={styles.item}>{item.name}</Text>}
      // ✅ Stable references: FlatList does not re-process
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={EmptyState}
    />
  );
};
```

**In this repo:** the row/header/separator subcomponents are declared at module
level or as separate memoized components (e.g. `DataListHeader`,
`DataListFooter`, `CanvasDivider` in
[DataList.tsx](src/scotia-lego-ui/src/components/dataList/DataList.tsx) and
[Collapsible.tsx](src/scotia-lego-ui/src/components/collapsible/Collapsible.tsx)),
not inside the body of the list component.

Reference: [Optimizing FlatList — React Native Docs](https://reactnative.dev/docs/optimizing-flatlist-configuration)
