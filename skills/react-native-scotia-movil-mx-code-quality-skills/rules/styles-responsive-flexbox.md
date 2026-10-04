---
title: Responsive Flexbox with useWindowDimensions
impact: MEDIUM
impactDescription: layouts that adapt to orientation and screen density
tags: styles, flexbox, responsive, useWindowDimensions, dimensions
---

## Responsive Flexbox with useWindowDimensions

**Impact: MEDIUM**

Fixed pixel values produce broken layouts on devices with different sizes.
`useWindowDimensions` provides width and height that update automatically on
rotation. `flex: 1` and percentages are preferable to fixed px.

**Incorrect (fixed dimensions):**

```tsx
// ❌ Fixed width: 360 — overflows on iPhone SE (375pt) or falls short on iPad
const ProfileCard = () => (
  <View style={{ width: 360, flexDirection: 'row', padding: 16 }}>
    <Image source={{ uri }} style={{ width: 80, height: 80 }} />
    {/* ❌ Fixed width that assumes the avatar is always 80pt */}
    <View style={{ width: 260, marginLeft: 16 }}>
      <Text>Ana García</Text>
    </View>
  </View>
);
```

**Correct (responsive with useWindowDimensions):**

```tsx
const ProfileCard = () => {
  const { width } = useWindowDimensions(); // ✅ Updated on rotation
  const isTablet = width >= 768;

  return (
    <View style={styles.card}>
      <Image
        source={{ uri }}
        style={isTablet ? styles.avatarLarge : styles.avatar}
        resizeMode="cover"
      />
      <View style={styles.info}>
        {' '}
        {/* ✅ flex: 1 = remaining space */}
        <Text style={[styles.name, isTablet && styles.nameLarge]}>
          Ana García
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarLarge: { width: 96, height: 96, borderRadius: 48 },
  info: { flex: 1, marginLeft: 16 }, // ✅ flex: 1 works at any width
  name: { fontSize: 18, fontWeight: '600' }, // color from the theme, not hardcoded
  nameLarge: { fontSize: 24 },
});
```

**In this repo:** `flex` and relative widths are preferred over fixed pixels; the
`Avatar` size is derived from a prop (`size`) in
[Avatar.tsx](src/scotia-lego-ui/src/components/avatar/Avatar.tsx), and the text
color comes from `canvasTheme.colorSemantic`, not hardcoded.

Reference: [Flexbox — React Native Docs](https://reactnative.dev/docs/flexbox)
