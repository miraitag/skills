---
title: Stable keys in lists and map
impact: HIGH
impactDescription: prevents remounts, loss of local state, and inefficient reconciliation
tags: lists, keys, map, reconciliation, keyExtractor, performance
---

## Stable keys in lists and map

**Impact: HIGH**

Keys must stably identify the element across renders. Using indices breaks
reconciliation when the order changes, rows are inserted, or elements are
filtered: React remounts cells, loses local state, and may animate the wrong
elements.

**Incorrect (index-based keys or keys derived from order):**

```tsx
{
  items.map((item, index) => (
    <View key={index} style={styles.row}>
      <Text>{item.label}</Text>
    </View>
  ));
}

<FlatList
  data={items}
  keyExtractor={(_, index) => index.toString()} // ❌ unstable key
  renderItem={renderItem}
/>;
```

**Correct (stable business key):**

```tsx
{
  items.map((item) => (
    <View key={item.id} style={styles.row}>
      <Text>{item.label}</Text>
    </View>
  ));
}

<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
/>;
```

**Rules:**

1. Use `id` or an immutable business key whenever one exists.
2. If there is no `id`, derive a stable key from the domain; do not use `index`.
3. In `FlatList`, `SectionList`, and `.map()`, the key must stay stable if the order changes.

**In this repo:** there are already several `map()` and `keyExtractor` calls using the index or composite keys built with the index; this rule avoids unnecessary remounts in views such as selectors, tables, and repeated blocks.

Reference: [React Docs — Rendering Lists](https://react.dev/learn/rendering-lists)
