---
title: gap instead of margin for Spacing
impact: MEDIUM
impactDescription: eliminates the "last element with extra margin" problem
tags: styles, gap, spacing, flexbox, margin
---

## gap instead of margin for Spacing

**Impact: MEDIUM**

`gap` on the container applies uniform separation between all its children
without touching the individual children. Available since React Native 0.71. It
eliminates per-element "spacing" classes and the last-element margin problem.

**Incorrect (margin on each child):**

```tsx
// ❌ Each element manages its own spacing — hard to keep uniform
const SignupForm = () => (
  <View style={styles.form}>
    <Text style={styles.label}>Name</Text>
    <TextInput style={[styles.input, styles.inputSpacing]} />
    <Text style={[styles.label, styles.labelSpacing]}>Email</Text>
    <TextInput style={[styles.input, styles.inputSpacing]} />
    {/* ❌ ad-hoc marginTop to separate the button */}
    <Pressable style={[styles.btn, { marginTop: 24 }]}>
      <Text>Sign up</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  form: { padding: 24 },
  inputSpacing: { marginTop: 6 },
  labelSpacing: { marginTop: 16 },
  // ...
});
```

**Correct (gap on the container):**

```tsx
// ✅ gap: all children get automatic, uniform separation
const SignupForm = () => (
  <View style={styles.form}>
    <View style={styles.field}>
      <Text style={styles.label}>{strings.signup.nameLabel}</Text>
      <TextInput style={styles.input} />
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>{strings.signup.emailLabel}</Text>
      <TextInput keyboardType="email-address" style={styles.input} />
    </View>
    <Pressable style={styles.btn}>
      <Text>{strings.signup.submit}</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  form: { padding: 24, gap: 16 }, // ✅ Separation between all children
  field: { gap: 6 }, // ✅ Separation label → input
  label: { fontSize: 13, fontWeight: '600' }, // color from the theme
  input: { padding: 14, borderRadius: 8 }, // color from the theme
  btn: { padding: 16, borderRadius: 10 }, // color from the theme
});
```

**In this repo:** `gap` is used for spacing between children (for example in the
`DataList` and `Search` containers) and colors are taken from
`canvasTheme.colorSemantic`, not hardcoded.

Reference: [Layout Props — React Native Docs](https://reactnative.dev/docs/layout-props#gap)
