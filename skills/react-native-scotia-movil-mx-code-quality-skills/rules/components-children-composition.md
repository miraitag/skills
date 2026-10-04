---
title: Composition with children
impact: HIGH
impactDescription: reduces coupling and increases reuse of container components
tags: components, children, composition, ReactNode
---

## Composition with children

**Impact: HIGH**

The `children: ReactNode` prop is React's composition mechanism. Instead of
creating multiple variants of a component with specific props for each case, a
container accepts children and wraps them with shared styles or behavior.

**Incorrect (component coupled to its content):**

```tsx
interface CardProps {
  body: string;
  footer: string;
  title: string;
}

// The component knows the internal structure — it is not reusable
const Card = ({ body, footer, title }: Readonly<CardProps>) => (
  <View style={{ padding: 16 }}>
    <CanvasText style={{ fontWeight: 'bold' }}>{title}</CanvasText>
    <CanvasText>{body}</CanvasText>
    <CanvasText style={{ fontSize: 12 }}>{footer}</CanvasText>
  </View>
);
```

**Correct (content-agnostic container):**

```tsx
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useCanvasCoreTheme } from '@scotia-movil-mx/react-native-canvas-core';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const Card = ({ children, style }: Readonly<CardProps>) => {
  const { canvasTheme } = useCanvasCoreTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: canvasTheme.colorSemantic.surfaceDefault },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12 },
});

// Usage — the parent decides the internal structure:
// <Card>
//   <CanvasText style={styles.title}>Title</CanvasText>
//   <Pressable onPress={...}><CanvasText>Action</CanvasText></Pressable>
// </Card>
```

**In this repo:** this pattern is already used in
[CanvasText.tsx](src/canvas-core/src/canvas-core/components/texts/CanvasText.tsx)
and [CanvasThemeProvider.tsx](src/canvas-core/src/canvas-core/theme/CanvasThemeProvider.tsx)
(`children: React.ReactNode`), and as `badgeContent?: ReactNode` in Avatar.
Always type props with `Readonly<Props>`, use `StyleProp<ViewStyle>` for the
`style` prop, and take colors from `canvasTheme.colorSemantic` instead of
hardcoding them.

Reference: [Passing JSX as children — React](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)
