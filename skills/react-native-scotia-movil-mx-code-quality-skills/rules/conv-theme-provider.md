---
title: ThemeProvider with separate contexts and a useColorScheme fallback
impact: HIGH
impactDescription: prevents global re-renders on theme change; strict typing of the dark scheme derived from the light one
tags: conventions, ThemeProvider, context, dark theme, useColorScheme, TypeScript
---

## ThemeProvider with separate contexts and a useColorScheme fallback

**Impact: HIGH**

Separating `ThemeTokensContext` from `ThemeDispatchContext` prevents
components that only consume style tokens from re-rendering when the dispatch
function changes. Storing state as `ThemeName | undefined` (not raw colors)
keeps the provider lightweight and lets it derive the actual scheme on demand.

**Incorrect (a single context with everything, state with raw colors):**

```tsx
// ❌ State with raw colors — massive re-render on theme change
const ThemeContext = createContext<
  | {
      primaryColor: string; // ❌ raw color
      textColor: string;
      setTheme: (t: string) => void;
    }
  | undefined
>(undefined);
```

**Correct (two contexts + ThemeName + useColorScheme fallback):**

```tsx
import { useColorScheme } from 'react-native';
import { createContext, useContext, useMemo, useState } from 'react';
import {
  lightColorScheme,
  LightColorScheme,
} from '../design-tokens/light-color-scheme';
import { darkColorScheme } from '../design-tokens/dark-color-scheme';

// ─── Types ────────────────────────────────────────────────────────────────
type ThemeName = 'light' | 'dark';

// ✅ The dark scheme MUST satisfy the same shape as the light one
const schemes: Record<ThemeName, LightColorScheme> = {
  light: lightColorScheme,
  dark: darkColorScheme, // TS error if any key is missing
};

// ─── Separate contexts ──────────────────────────────────────────────────
const ThemeTokensContext = createContext<LightColorScheme | undefined>(
  undefined
);
const ThemeDispatchContext = createContext<
  ((t: ThemeName) => void) | undefined
>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ✅ State as a theme name, not as colors
  const systemScheme = useColorScheme(); // fallback if the user has not chosen
  const [themeName, setThemeName] = useState<ThemeName | undefined>(undefined);

  const resolvedName: ThemeName =
    themeName ?? (systemScheme === 'dark' ? 'dark' : 'light'); // ✅ fallback

  // ✅ Memoize tokens to avoid re-renders of token consumers
  const tokens = useMemo(() => schemes[resolvedName], [resolvedName]);

  return (
    <ThemeDispatchContext.Provider value={setThemeName}>
      <ThemeTokensContext.Provider value={tokens}>
        {children}
      </ThemeTokensContext.Provider>
    </ThemeDispatchContext.Provider>
  );
}

// ─── Custom hooks ─────────────────────────────────────────────────────────
export function useTheme() {
  const ctx = useContext(ThemeTokensContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useThemeDispatch() {
  const ctx = useContext(ThemeDispatchContext);
  if (!ctx)
    throw new Error('useThemeDispatch must be used within ThemeProvider');
  return ctx;
}
```

Reference: [React Context — separating state from dispatch](https://react.dev/learn/scaling-up-with-reducer-and-context)

**In this repo:** the current pattern is
[CanvasThemeProvider.tsx](src/canvas-core/src/canvas-core/theme/CanvasThemeProvider.tsx):
it resolves the scheme with a `prop → useColorScheme() → 'light'` fallback,
memoizes the theme and the `value` with `useMemo`, and exposes
`useCanvasCoreTheme()`, which throws an error outside the Provider. Scotia Lego
adds a layer that wraps the Canvas one
([scotia-lego-theme.provider.tsx](src/scotia-lego-ui/src/theme/scotia-lego-theme.provider.tsx)).
State is stored as a variant/scheme (not raw colors), and the provider props
are typed with `Readonly<Props>`.
