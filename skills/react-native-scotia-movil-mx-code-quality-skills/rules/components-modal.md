---
title: Modal — Visibility, onRequestClose and SafeArea
impact: HIGH
impactDescription: without onRequestClose Android Back has no effect; SafeAreaContext required for Edge-to-Edge
tags: components, modal, android, safearea, onRequestClose, safe-area-context
---

## Modal — Visibility, onRequestClose and SafeArea

**Impact: HIGH**

`onRequestClose` is mandatory for Android Back button navigation — without it the
user gets permanently trapped inside the modal. In modern React Native (0.76+ and
Android 15 edge-to-edge), native `SafeAreaView` from `'react-native'` is deprecated;
you must use `react-native-safe-area-context` (`useSafeAreaInsets` or its
`SafeAreaView`).

**Incorrect:**

```tsx
// ❌ Using deprecated SafeAreaView from 'react-native'
// ❌ Missing onRequestClose: Android Back button does not close the modal
// ❌ Unmounting with {visible && <Modal .../>} skips native exit animation
<Modal visible={visible}>
  <View style={{ flex: 1 }}>
    <Text>Content</Text>
  </View>
</Modal>
```

**Correct:**

```tsx
import { memo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CanvasText,
  useCanvasCoreTheme,
} from '@scotia-movil-mx/react-native-canvas-core';

export const BaseModal = memo(
  ({ children, onDismiss, visible }: Readonly<BaseModalProps>) => {
    const { canvasTheme } = useCanvasCoreTheme();
    const insets = useSafeAreaInsets(); // ✅ Handles notches, dynamic island, and Android edge-to-edge

    return (
      <Modal
        visible={visible} // ✅ Controlled visibility allows native exit transition to play
        transparent
        animationType="fade"
        onRequestClose={onDismiss} // ✅ Mandatory for Android Back button
      >
        {/* ✅ Themed backdrop that closes on press */}
        <Pressable
          style={[
            styles.backdrop,
            { backgroundColor: canvasTheme.colorSemantic.backgroundOverlay },
          ]}
          onPress={onDismiss}
        />
        <View
          style={[
            styles.container,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          {children}
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
});
```

**Animation Tip:** Do not conditionally unmount the Modal with `{isOpen && <BaseModal ... />}`
if you want the native exit transition to display; instead pass `visible={isOpen}`
directly so React Native's native layer can finish the dismiss animation cleanly.

**In this repo:** the base component is
[BaseModal.tsx](src/canvas-core/src/canvas-core/components/overlay/baseModal/BaseModal.tsx)
(wrapped in `memo`, with `onRequestClose` and a themed backdrop); alerts are
composed on top of it in
[CanvasModalAlert.tsx](src/canvas-core/src/canvas-core/components/overlay/canvasModelAlert/CanvasModalAlert.tsx).
Reuse `BaseModal`, type props with `Readonly<Props>`, and ensure insets are respected
via `react-native-safe-area-context`.

Reference: [Modal — React Native Docs](https://reactnative.dev/docs/modal)
