---
title: 'GPU Animations: transform and opacity'
impact: HIGH
impactDescription: 60 fps without blocking the JS thread or forcing layout recalculation
tags: animations, GPU, transform, opacity, Animated, performance
---

## GPU Animations: transform and opacity

**Impact: HIGH**

Only `transform` (translateX/Y, scaleX/Y, scale, rotate) and `opacity` run on
the GPU compositing thread. Animating `width`, `height`, `margin`, or
`top/left` forces a full layout recalculation on every frame, causing drops
from 60 fps to ~10-15 fps on mid-range devices.

**Incorrect (animating layout properties):**

```tsx
const animHeight = useRef(new Animated.Value(0)).current;

// ❌ height forces a layout recalculation on every frame
const expand = () =>
  Animated.timing(animHeight, {
    toValue: 200,
    duration: 300,
    useNativeDriver: false, // ❌ Must be false with height/width
  }).start();

<Animated.View style={{ height: animHeight, overflow: 'hidden' }}>
  {content}
</Animated.View>;
```

**Correct (transform: scaleY + translateY to simulate expand/collapse):**

```tsx
const animScale = useRef(new Animated.Value(0)).current;
const animOpacity = useRef(new Animated.Value(0)).current;

const expand = () =>
  Animated.parallel([
    Animated.timing(animScale, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true, // ✅ Runs on the native UI thread
    }),
    Animated.timing(animOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true, // ✅
    }),
  ]).start();

const collapse = () =>
  Animated.parallel([
    Animated.timing(animScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }),
    Animated.timing(animOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }),
  ]).start();

<Animated.View
  style={{
    overflow: 'hidden',
    // ✅ scaleY simulates expand without recalculating layout
    transform: [{ scaleY: animScale }],
    opacity: animOpacity,
    // Set transformOrigin to top so it grows downward
    transformOrigin: 'top',
  }}
>
  {content}
</Animated.View>;
```

**GPU-safe properties:**

| ✅ GPU (useNativeDriver: true) | ❌ CPU / Layout (useNativeDriver: false) |
| ------------------------------ | ---------------------------------------- |
| `transform: [{ translateX }]`  | `width`, `height`                        |
| `transform: [{ scaleY }]`      | `margin`, `padding`                      |
| `transform: [{ rotate }]`      | `top`, `left`, `right`, `bottom`         |
| `opacity`                      | `borderWidth`, `borderRadius` (certain)  |

**In this repo:** animations use `useNativeDriver: true` and only
`transform`/`opacity`. See [CanvasShimmer.tsx](src/canvas-core/src/canvas-core/components/shimmer/canvasShimmer/CanvasShimmer.tsx)
(`Animated` API) and the BottomSheet hook using `react-native-reanimated`
([useCanvasBottomSheetAnimation.ts](src/canvas-core/src/canvas-core/components/overlay/canvasBottomSheet/hooks/useCanvasBottomSheetAnimation.ts),
`useSharedValue` + `withTiming`).

Reference: [Animations — React Native Docs](https://reactnative.dev/docs/animations)
