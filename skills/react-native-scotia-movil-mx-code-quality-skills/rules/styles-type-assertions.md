---
title: Type StyleSheet Entries with satisfies ViewStyle / TextStyle / ImageStyle
impact: MEDIUM
impactDescription: safe type validation without unsafe 'as' assertions; prevents typos while preserving literal types
tags: styles, typescript, satisfies, ViewStyle, TextStyle, ImageStyle, StyleSheet
---

## Type StyleSheet Entries with `satisfies`

**Impact: MEDIUM**

Without annotations, TypeScript infers a broad union for each entry in
`StyleSheet.create`. However, using type assertions (`as ViewStyle`) is an
anti-pattern in TypeScript because `as` bypasses compiler validation and can mask
errors.

The modern TypeScript standard (TS 4.9+) is the **`satisfies`** operator:
it validates that the style declaration conforms strictly to `ViewStyle`,
`TextStyle`, or `ImageStyle` without widening the type or disabling checks.

**Incorrect (unsafe `as` casting or unconstrained union):**

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    // ❌ fontWeight belongs to TextStyle, not ViewStyle — 'as' can mask structural mismatches
    fontWeight: '700',
  } as ViewStyle, // ❌ Unsafe type assertion: bypasses strict type checking!

  title: {
    fontSize: 24,
    // ❌ resizeMode belongs to ImageStyle, not TextStyle
    resizeMode: 'cover',
  },
});
```

**Correct (`satisfies ViewStyle / TextStyle / ImageStyle`):**

```tsx
import { type ViewStyle, type TextStyle, type ImageStyle, StyleSheet } from 'react-native';

// Colors are not part of these static styles: they come from canvasTheme
// (useCanvasCoreTheme) as dynamic styles — see conv-design-tokens.

const styles = StyleSheet.create({
  // ✅ ViewStyle: layout and container properties
  container: {
    flex: 1,
    padding: 16,
  } satisfies ViewStyle,

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } satisfies ViewStyle,

  // ✅ TextStyle: fontWeight, fontSize, lineHeight, letterSpacing…
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  } satisfies TextStyle,

  // ✅ ImageStyle: resizeMode, tintColor, objectFit…
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: 'cover',
  } satisfies ImageStyle,
});
```

**In this repo:** `style` props are typed with `StyleProp<ViewStyle>` /
`StyleProp<TextStyle>` (see [canvas-button.props.ts](src/canvas-core/src/canvas-core/components/buttons/canvasButton/canvas-button.props.ts)),
and the `StyleSheet.create` objects contain only static layout. Use `satisfies`
instead of `as` for strict compile-time validation.

Reference: [TypeScript — satisfies Operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
