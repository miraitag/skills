---
title: Typed Context API with createContext
impact: HIGH
impactDescription: detects usage outside the Provider; removes any from the context
tags: state, hooks, context, createContext, provider, custom-hook
---

## Typed Context API with createContext

**Impact: HIGH**

> **Scope:** this rule owns the context *mechanics* — `createContext<T | undefined>`,
> the guard that throws outside the provider, and the memoized `value`. File
> names, the `contexts/hooks/` accessor folder, gateway injection in the provider
> and "no raw `useContext` in screens" are the architecture rule
> `contexts-provider-conventions`.

`createContext<T | undefined>(undefined)` as the default value detects at
runtime whether the component is outside the Provider. A custom hook with
validation encapsulates the access and throws a descriptive error. `useMemo` on
the `value` avoids unnecessary re-renders in the consumers.

**Incorrect (null + any, no custom hook, no memo):**

```tsx
// ❌ createContext(null) with no type: TypeScript treats the value as null
const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }: Props) => {
  const [dark, setDark] = useState(false);
  // ❌ A single setState recreates the value object on every render
  return (
    <ThemeContext.Provider value={{ dark, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ❌ ctx is null | any — guaranteed crash outside the Provider
const ctx = useContext(ThemeContext);
ctx.dark; // TypeError if used outside the Provider
```

**Correct (explicit type + custom hook + useMemo):**

```tsx
interface ThemeContextValue {
  dark: boolean;
  toggleTheme: () => void;
}

// ✅ undefined detects usage outside the Provider at runtime
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [dark, setDark] = useState(false);
  const toggleTheme = useCallback(() => setDark((d) => !d), []);
  // ✅ useMemo: the object is only recreated when dark or toggleTheme change
  const value = useMemo(() => ({ dark, toggleTheme }), [dark, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
```

**In this repo:** this pattern is exactly the one used for theming. See
[CanvasThemeContext.tsx](src/canvas-core/src/canvas-core/theme/CanvasThemeContext.tsx)
(typed `createContext` + `useCanvasCoreTheme` with `throw` if used outside the
Provider) and [CanvasThemeProvider.tsx](src/canvas-core/src/canvas-core/theme/CanvasThemeProvider.tsx)
(`value` memoized with `useMemo`). Scotia Lego adds a layer with
[scotia-lego-theme.provider.tsx](src/scotia-lego-ui/src/theme/scotia-lego-theme.provider.tsx),
which wraps `CanvasThemeProvider`. Type the provider props with
`Readonly<Props>`.

Reference: [createContext — React Docs](https://react.dev/reference/react/createContext)
