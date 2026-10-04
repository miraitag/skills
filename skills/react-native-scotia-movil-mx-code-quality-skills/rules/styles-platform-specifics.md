---
title: Platform.OS and Platform.select
impact: MEDIUM
impactDescription: clean per-platform style separation inside StyleSheet
tags: styles, platform, Platform.select, ios, android
---

## Platform.OS and Platform.select

**Impact: MEDIUM**

`Platform.select<T>()` inside `StyleSheet.create` centralizes per-platform
variations in a single place. The component stays free of conditional logic
and the styles are registered only once.

**Incorrect (logic scattered across the component):**

```tsx
const Header = ({ title }: Props) => {
  // ❌ Style objects built on every render
  const shadowStyle =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
        }
      : { elevation: 4 };

  const fontSize = Platform.OS === 'ios' ? 17 : 18;

  return (
    <View style={[styles.header, shadowStyle]}>
      <Text style={[styles.title, { fontSize }]}>{title}</Text>
    </View>
  );
};
```

**Correct (Platform.select inside StyleSheet):**

```tsx
// ✅ The component has no platform logic — everything is in styles
const Header = ({ title }: Props) => {
  const { canvasTheme } = useCanvasCoreTheme();
  // colors from canvasTheme as memoized dynamic styles; static layout in StyleSheet
  const dynamicStyles = useMemo(
    () => ({ header: { backgroundColor: canvasTheme.colorSemantic.surfaceDefault } }),
    [canvasTheme]
  );
  return (
    <View style={[styles.header, dynamicStyles.header]}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    // ✅ Platform.select inside StyleSheet: registered only once
    ...Platform.select({
      ios: {
        shadowColor: colors.common.shadow, // values/colors.ts fallback (module scope: no theme hook)
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 6 },
    }),
    // 💡 Note: In React Native 0.76+ with New Architecture, CSS `boxShadow`
    // (e.g., boxShadow: '0 2px 4px rgba(0,0,0,0.2)') works uniformly across both platforms.
  },
  title: {
    fontWeight: '600',
    // color from canvasTheme.colorSemantic, not hardcoded
    // ✅ Platform.select infers the type: number on both platforms
    fontSize: Platform.select<number>({ ios: 17, android: 18, default: 17 }),
  },
});
```

**In this repo:** when there are per-platform differences (such as platform fonts or
elevations), centralize them with `Platform.select` inside `StyleSheet.create` and
leave color/typography tokens to `canvasTheme`. Avoid building style objects with
platform logic inside the component body.

Reference: [Platform — React Native Docs](https://reactnative.dev/docs/platform)
