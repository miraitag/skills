---
title: M3 Design Tokens in 3 Layers
impact: HIGH
impactDescription: rebranding or theme changes without touching component code; consistent palette across the entire app
tags: conventions, design tokens, Material Design 3, theme, colors, typography
---

## M3 Design Tokens in 3 Layers

**Impact: HIGH**

> **Scope:** this rule is the single owner of hardcoded colors / magic style
> values in code. The `values/` folder structure and centralized texts are the
> architecture rule `values-conventions`.

### Fix order for a hardcoded color (`'#EC111A'`, `rgb(…)`, `'red'`)

1. **`canvasTheme` first.** Every project must depend on
   `@scotia-movil-mx/react-native-canvas-core` and read colors through its
   theme hook (`theme_hook` in `.scotia-audit/profile.md`, default
   `useCanvasCoreTheme`): `const { canvasTheme } = useCanvasCoreTheme();` →
   `canvasTheme.colorSemantic.<role>`. Map the hex to the semantic role that
   matches its *meaning* (background, text, border, error…), not just its value.
2. **`values/colors.ts` as the alternative** — only when the design system has
   no equivalent token. Declare it once (`colors.<feature>.<name>`) and consume
   it from there; never leave the literal in a component, style or mapper.
3. If `canvas-core` is missing from `package.json`, report it: the project must
   add it before colors can be migrated to the theme.

A 3-layer token architecture lets you change the entire palette by editing
only layer 1, adjust semantic roles in layer 2, and keep all components
unchanged. Using raw colors directly in components breaks consistency and
makes dark mode or rebranding impossible.

**Incorrect (raw colors in components):**

```tsx
// ❌ Hexadecimal color directly in the component
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#EC111A', // ❌ Hardcoded Scotiabank red
    borderRadius: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16, // ❌ Magic value without a typographic scale
  },
});
```

**Correct (3 M3 layers):**

```tsx
// ─── Layer 1: Base color palette (canvasBaseColors) ─────────────────
// design-tokens/canvas-base-colors.ts
export const canvasBaseColors = {
  scotiaRed: {
    50: '#FFF0F0',
    100: '#FFCECE',
    500: '#EC111A', // ← primary brand color
    700: '#B30D13',
  },
  neutral: {
    0: '#FFFFFF',
    100: '#F5F5F5',
    900: '#1A1A1A',
  },
} as const;

// ─── Layer 2: M3 semantic roles (Color Scheme) ─────────────────────────
// design-tokens/light-color-scheme.ts
import { canvasBaseColors as c } from './canvas-base-colors';

export const lightColorScheme = {
  primary: c.scotiaRed[500],
  onPrimary: c.neutral[0],
  primaryContainer: c.scotiaRed[50],
  surface: c.neutral[0],
  onSurface: c.neutral[900],
  // … Shape Scale
  shapeMedium: 8, // border-radius
  shapeLarge: 16,
  // … Type Scale
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
} as const;

export type LightColorScheme = typeof lightColorScheme;

// ─── Layer 3: Component uses only theme roles ──────────────────────────
import { useTheme } from '../hooks/use-theme';

function PrimaryButton({ label }: { label: string }) {
  const t = useTheme(); // ✅ Accesses lightColorScheme/darkColorScheme

  return (
    <Pressable
      style={{
        backgroundColor: t.color.primary, // ✅ semantic role
        borderRadius: t.shape.medium, // ✅ Shape Scale
        padding: 12,
      }}
    >
      <Text style={[t.typography.bodyMedium, { color: t.color.onPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}
```

**In this repo:** the token system already exists with a layered structure
Global → Base → Semantic → Component, both for colors
([CanvasSemanticColors.ts](src/canvas-core/src/canvas-core/theme/colors/CanvasSemanticColors.ts))
and typography
([CanvasSemanticTypography.ts](src/canvas-core/src/canvas-core/theme/typography/CanvasSemanticTypography.ts)),
with `default`/`wealth` (Canvas) and `mass`/`affluent` (Scotia Lego) variants.
Components access it via `useCanvasCoreTheme()` and prefer **semantic** tokens
(`canvasTheme.colorSemantic.*`) over component tokens. Never use raw
hexadecimal values.

Reference: [Material Design 3 — Color System](https://m3.material.io/styles/color/system/overview)
