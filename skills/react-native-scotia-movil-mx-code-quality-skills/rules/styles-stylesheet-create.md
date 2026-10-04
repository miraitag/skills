---
title: StyleSheet.create vs Inline Styles
impact: HIGH
impactDescription: eliminates GC allocation churn in Hermes and validates styles statically
tags: styles, StyleSheet, inline, performance, Hermes, GC
---

## StyleSheet.create vs Inline Styles

**Impact: HIGH**

> **Scope:** *how* styles are written. Keeping them collocated in the component
> `.tsx` (no separate styles file) is the architecture rule
> `screen-components-conventions`; hardcoded colors are `conv-design-tokens`.

Inline styles create brand-new JavaScript objects on every single render. This
generates continuous garbage collection (GC) pressure in the Hermes engine and
breaks shallow equality in memoized children.

`StyleSheet.create` allocates style declarations once at module load time,
freezes them in `__DEV__` (`Object.freeze`), and enables TypeScript style
validation. In the New Architecture (Fabric), styles are referenced directly via
JSI without serialization overhead.

**Incorrect (new objects on every render):**

```tsx
// ❌ Each render creates 3 new JS objects on the heap
const TabItem = ({ isActive }: Props) => (
  <Pressable
    style={{
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      backgroundColor: isActive ? '#1e40af' : '#1e293b',
    }}
  >
    <Text style={{ color: isActive ? '#93c5fd' : '#64748b', fontSize: 14 }}>
      Tab
    </Text>
  </Pressable>
);
```

**Correct (StyleSheet.create + dynamic styles memoized or separated):**

```tsx
// ✅ Static layout registered ONCE; dynamic theme styles cleanly memoized
const TabItem = ({ isActive, title }: Readonly<Props>) => {
  const { canvasTheme } = useCanvasCoreTheme();

  const dynamicStyles = useMemo(
    () => ({
      tab: {
        backgroundColor: isActive
          ? canvasTheme.colorSemantic.backgroundPrimary
          : canvasTheme.colorSemantic.surfaceDefault,
      },
      text: {
        color: isActive
          ? canvasTheme.colorSemantic.textDefault
          : canvasTheme.colorSemantic.textPlaceholder,
      },
    }),
    [canvasTheme, isActive]
  );

  return (
    <Pressable style={[styles.tab, dynamicStyles.tab]}>
      <CanvasText style={dynamicStyles.text}>{title}</CanvasText>
    </Pressable>
  );
};

// ✅ StyleSheet.create: ONLY static layout (no hardcoded colors)
const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
});
```

**Note:** For dynamic styles that change based on state or props, compute them with
`useMemo` or a theme hook. Never pass raw inline object literals `{ color: ... }`
directly in JSX.

**In this repo:** each component combines a local `StyleSheet.create` for the
static layout with semantic tokens from `canvasTheme` — for example
[CanvasButton.tsx](src/canvas-core/src/canvas-core/components/buttons/canvasButton/CanvasButton.tsx)
and [CanvasText.tsx](src/canvas-core/src/canvas-core/components/texts/CanvasText.tsx).
Never hardcode colors inside `StyleSheet.create`.

Reference: [StyleSheet — React Native Docs](https://reactnative.dev/docs/stylesheet)
