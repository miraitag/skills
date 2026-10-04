---
title: React.FC — Why to Avoid It
impact: MEDIUM
impactDescription: favors idiomatic functions, clean generic support, and explicit Readonly props
tags: typescript, react-fc, components, generics, return-type
---

## React.FC — Why to Avoid It

**Impact: MEDIUM**

While `@types/react` v18 removed implicit `children` from `React.FC`, defining
components directly as standard functions remains the industry best practice:
1. **Generics:** Direct functions support TypeScript generic parameters (`<T>`) naturally, whereas `React.FC` cannot cleanly express generics.
2. **Readonly Safety:** Direct functions allow explicit typing with `Readonly<Props>` to prevent accidental prop mutation.
3. **Simplicity:** Eliminates unnecessary typing layers and return-type restrictions.

**Incorrect (using React.FC wrapper):**

```tsx
// ❌ Unnecessary React.FC wrapper — awkward with generics and extra boilerplate
const Header: React.FC<HeaderProps> = ({ title, subtitle }) => (
  <View style={styles.container}>
    <CanvasText style={styles.title}>{title}</CanvasText>
  </View>
);
```

**Correct (direct function with Readonly<Props>):**

```tsx
interface HeaderProps {
  subtitle?: string;
  title: string;
  // Declare children ONLY when the component explicitly consumes them
  // children?: ReactNode;
}

// ✅ Direct function with Readonly<Props>: idiomatic, inferable, supports generics
const Header = ({ subtitle, title }: Readonly<HeaderProps>) => (
  <View style={styles.container}>
    <CanvasText style={styles.title}>{title}</CanvasText>
    {Boolean(subtitle?.trim()) && (
      <CanvasText style={styles.subtitle}>{subtitle}</CanvasText>
    )}
  </View>
);

// ✅ Generic component example:
// const Selector = <T,>({ items, onSelect }: Readonly<SelectorProps<T>>) => ( ... );
```

**In this repo:** no component uses `React.FC`. An arrow function with
`Readonly<Props>` and inferred return is always declared — for example
[CanvasText.tsx](src/canvas-core/src/canvas-core/components/texts/CanvasText.tsx)
and [CanvasButton.tsx](src/canvas-core/src/canvas-core/components/buttons/canvasButton/CanvasButton.tsx).

Reference: [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components/)
