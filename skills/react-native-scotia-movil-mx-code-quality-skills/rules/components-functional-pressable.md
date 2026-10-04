---
title: Functional Component and Pressable
impact: CRITICAL
impactDescription: mandatory modern pattern — TouchableOpacity is deprecated
tags: components, pressable, functional, class
---

## Functional Component and Pressable

**Impact: CRITICAL**

Class components are obsolete in modern React. The current standard is functions
(arrow functions) that return JSX. `TouchableOpacity` has been replaced by
`Pressable`, which exposes the "pressed" state as a render function, allowing
dynamic styles without external libraries.

**Incorrect (class + TouchableOpacity):**

```tsx
import React, { Component } from 'react';
import { TouchableOpacity, Text } from 'react-native';

class ActionButton extends Component<Props> {
  render() {
    return (
      <TouchableOpacity
        onPress={this.props.onPress}
        style={{ padding: 12, backgroundColor: '#3b82f6' }}
      >
        <Text style={{ color: '#fff' }}>{this.props.label}</Text>
      </TouchableOpacity>
    );
  }
}
```

**Correct (functional + Pressable + theme tokens, repo pattern):**

```tsx
import { Pressable, StyleSheet } from 'react-native';
import {
  CanvasText,
  useCanvasCoreTheme,
} from '@scotia-movil-mx/react-native-canvas-core';

export const ActionButton = ({
  disabled = false,
  label,
  onPress,
}: Readonly<ActionButtonProps>) => {
  const { canvasTheme } = useCanvasCoreTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // ✅ Improves tap target area
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled
            ? canvasTheme.colorSemantic.backgroundDisabled
            : canvasTheme.colorSemantic.backgroundPrimary,
          opacity: pressed && !disabled ? 0.8 : 1, // ✅ Visual feedback on press
        },
      ]}
    >
      <CanvasText
        style={{ color: canvasTheme.colorSemantic.textDefaultInverted }}
      >
        {label}
      </CanvasText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 24,
  },
});
```

**In this repo:** the base button is `CanvasButton`
(`src/canvas-core/src/canvas-core/components/buttons/canvasButton/CanvasButton.tsx`).
Reuse it instead of creating new buttons. Type props with `Readonly<Props>`,
derive state styles with utilities like `setButtonBackgroundColor` /
`setButtonBorder` that read `canvasTheme.colorSemantic`, and use `CanvasText`
instead of `Text`. Never hardcode colors.

Reference: [Pressable — React Native Docs](https://reactnative.dev/docs/pressable)
