---
title: A single style is passed directly, not inside an array
impact: LOW
impactDescription: avoids allocating a new array on every render and keeps style props readable
tags: styles, style, array, StyleSheet, composition
---

## A single style is passed directly, not inside an array

**Impact: LOW**

The array form of `style` exists to **compose** several styles
(`[styles.base, isActive && styles.active, dynamicStyles.text]`). Wrapping a
single style in an array allocates a new array on every render (a new
reference for memoized children) and adds noise. Applies to every style prop:
`style`, `contentContainerStyle`, `textStyle`, `containerStyle`, etc.

**Incorrect:**

```tsx
<View style={[styles.container]} />                         // ❌
<ScrollView contentContainerStyle={[styles.content]} />     // ❌
<CanvasText style={[dynamicStyles.title]} />                // ❌
```

**Correct:**

```tsx
<View style={styles.container} />                           // ✅
<ScrollView contentContainerStyle={styles.content} />       // ✅
<CanvasText style={dynamicStyles.title} />                  // ✅
<View style={[styles.row, isSelected && styles.selected]} /> // ✅ real composition
```

**Detection:** `node <skill>/scripts/scan.mjs --rule=styles-single-style-no-array`
(`*Style={[ <one element> ]}`).

**Correction:**

1. Remove the brackets: `style={[x]}` → `style={x}`.
2. `pnpm lint --fix`.
