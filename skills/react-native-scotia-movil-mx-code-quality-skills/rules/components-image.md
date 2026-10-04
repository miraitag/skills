---
title: Image — Dimensions, resizeMode and Accessibility
impact: HIGH
impactDescription: image invisible without explicit dimensions; accessibility mandatory
tags: components, image, accessibility, resizeMode, dimensions
---

## Image — Dimensions, resizeMode and Accessibility

**Impact: HIGH**

The `Image` component requires explicit dimensions for remote images because it
cannot infer them from a URL. `resizeMode="cover"` maintains the aspect ratio.
`accessibilityLabel` is mandatory for users with VoiceOver/TalkBack.
Dynamic styles that depend on props must use `useMemo`, not `StyleSheet.create`
(which only accepts static objects).

**Incorrect:**

```tsx
const ProductCard = ({ source }: Readonly<{ source: ImageSourcePropType }>) => (
  <View>
    {/* ❌ Without width/height: invisible image */}
    <Image source={source} />

    {/* ❌ Without accessibilityLabel */}
    <Image source={source} style={{ width: 200, height: 150 }} />

    {/* ❌ resizeMode="stretch" distorts the image */}
    <Image
      source={source}
      style={{ width: 80, height: 80 }}
      resizeMode="stretch"
    />
  </View>
);
```

**Correct:**

```tsx
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
} from 'react-native';
import { useCanvasCoreTheme } from '@scotia-movil-mx/react-native-canvas-core';

interface AvatarProps {
  avatarSource: ImageSourcePropType;
  name: string;
  size?: number;
}

const Avatar = ({ avatarSource, name, size = 80 }: Readonly<AvatarProps>) => {
  const { canvasTheme } = useCanvasCoreTheme();
  const [loading, setLoading] = useState(true);

  // ✅ Styles that depend on props → useMemo (not StyleSheet.create)
  const dynamicStyles = useMemo(
    () => ({
      container: { width: size, height: size, borderRadius: size / 2 } as const,
      image: { width: size, height: size, borderRadius: size / 2 } as const,
    }),
    [size]
  );

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: canvasTheme.colorSemantic.surfaceDefault },
        dynamicStyles.container,
      ]}
    >
      <Image
        source={avatarSource}
        style={[styles.image, dynamicStyles.image]}
        resizeMode="cover"
        accessible
        accessibilityLabel={`Profile photo of ${name}`}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && <ActivityIndicator style={styles.loader} />}
    </View>
  );
};

// ✅ StyleSheet.create: ONLY static styles (no hardcoded color)
const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  image: {},
  loader: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
```

**In this repo:** the base implementation is
[Avatar.tsx](src/scotia-lego-ui/src/components/avatar/Avatar.tsx), which uses
`Image` from `react-native` with `source: ImageSourcePropType`, `accessible`,
`accessibilityLabel` and dimensions derived from a prop. Type props with
`Readonly<Props>`, prefer `ImageSourcePropType` (supports local or remote
images) over `uri: string`, and take colors from `canvasTheme.colorSemantic`.

Reference: [Image — React Native Docs](https://reactnative.dev/docs/image)
