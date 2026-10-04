---
title: Optimized FlatList and Virtualized Lists
impact: CRITICAL
impactDescription: virtualization with getItemLayout and windowSize tuning prevents memory bloat and scroll drops
tags: lists, FlatList, virtualization, memo, keyExtractor, getItemLayout, windowSize, performance
---

## Optimized FlatList and Virtualized Lists

**Impact: CRITICAL**

`ScrollView` mounts all child elements into memory at once — with 50+ items it
leads to high RAM consumption and dropped frames. `FlatList` virtualizes: it
mounts only items within the render window.

To achieve 60/120 fps scroll without stutter:
1. Memoize list items (`React.memo`).
2. Provide **`getItemLayout`** when item height is known (skips native layout measurements).
3. Tune **`windowSize`** (default 21 is excessive on mobile; 5 to 7 cuts memory usage by 60%).
4. Set an appropriate **`initialNumToRender`**.
5. Use `@shopify/flash-list` as an advanced alternative when dealing with thousands of items.

**Incorrect (ScrollView with unvirtualized mapping):**

```tsx
// ❌ ScrollView + map: mounts every item into RAM simultaneously
const ProductList = ({ products }: Props) => (
  <ScrollView>
    {products.map((product) => (
      // ❌ Missing stable key & inline styles
      <View key={product.id} style={{ padding: 16, height: 72 }}>
        <Text>{product.name}</Text>
      </View>
    ))}
  </ScrollView>
);
```

**Correct (FlatList with getItemLayout, tuned windowSize, and memoized items):**

```tsx
const ITEM_HEIGHT = 72;

// ✅ Memoized item: only re-renders if item attributes change
const ProductItem = memo(({ category, name, price }: ItemProps) => (
  <View style={styles.item}>
    <View style={styles.itemContent}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.category}>{category}</Text>
    </View>
    <Text style={styles.price}>${price.toFixed(2)}</Text>
  </View>
));

const Separator = () => <View style={styles.separator} />;

const ProductList = ({ products }: Props) => {
  const keyExtractor = useCallback((item: Product) => item.id, []);

  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item }) => (
      <ProductItem
        name={item.name}
        price={item.price}
        category={item.category}
      />
    ),
    []
  );

  // ✅ getItemLayout completely skips dynamic async layout measurements
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <FlatList
      data={products}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ItemSeparatorComponent={Separator}
      getItemLayout={getItemLayout} // ✅ Essential for fast instant scrolling
      initialNumToRender={10} // ✅ Fast initial paint
      maxToRenderPerBatch={10} // ✅ Smoother batch rendering
      windowSize={7} // ✅ Conserves RAM (replaces default 21)
      // Note: Use removeClippedSubviews cautiously on Android as it can cause clipping bugs with complex transforms
    />
  );
};
```

**In this repo:** this virtualization pattern is used in
[DataList.tsx](src/scotia-lego-ui/src/components/dataList/DataList.tsx)
(`useMemo` for `data`, `useCallback<ListRenderItem<DataListEntry>>` for
`renderItem`, `keyExtractor`) and in
[Collapsible.tsx](src/scotia-lego-ui/src/components/collapsible/Collapsible.tsx).
For high-density tables or endless feeds, consider adopting `@shopify/flash-list`
which recycles native views instead of destroying and recreating them.

Reference: [FlatList — React Native Docs](https://reactnative.dev/docs/flatlist)
