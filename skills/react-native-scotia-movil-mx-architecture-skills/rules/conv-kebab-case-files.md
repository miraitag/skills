---
title: Kebab-case file names
impact: MEDIUM
impactDescription: consistency across case-sensitive file systems (Linux/macOS) and browsers; alignment with Expo Router
tags: conventions, kebab-case, PascalCase, naming, files
---

## Kebab-case file names

**Impact: MEDIUM**

Linux file systems (CI, Docker) are case-sensitive. Naming files in kebab-case
avoids module resolution errors in production and is compatible with Expo
Router's file-based routing system. The export must be PascalCase to follow
React conventions.

**Incorrect:**

```
MyAccountScreen.tsx      ❌ PascalCase in file name
useAuthStore.tsx         ❌ Hook with .tsx extension instead of .ts
myaccountscreen.tsx      ❌ all lowercase with no separation
TransferFeature.tsx      ❌ PascalCase in file name
```

```tsx
// MyAccountScreen.tsx — ❌ incorrect name
export default function myAccountScreen() { ... } // ❌ export not PascalCase
```

**Correct:**

```
my-account-screen.tsx    ✅ kebab-case
use-auth-store.ts        ✅ hook — kebab-case + .ts (not .tsx if there is no JSX)
transfer-feature.tsx     ✅ kebab-case
account.service.ts       ✅ allowed type suffix
user.interface.ts        ✅ allowed type suffix
```

```tsx
// my-account-screen.tsx — ✅ correct name
export default function MyAccountScreen() {
  // ✅ PascalCase export
  return <View />;
}

// use-auth-store.ts — ✅ hook in kebab-case
export function useAuthStore() {
  // ✅ 'use' + PascalCase
  return useContext(AuthContext);
}
```

**Mnemonic rule:**

- File → kebab-case
- Exported component/function → PascalCase (components) / camelCase (hooks, utilities)

**Variants — selected per project with `naming_variant` in
`.scotia-audit/profile.md`:**

| File type     | `feature-library` (default)              | `design-system` (canvas-core / lego-ui) |
| ------------- | ---------------------------------------- | --------------------------------------- |
| Component     | kebab-case `.tsx` (`beneficiaries-footer.tsx`) | **PascalCase** `.tsx` (`CanvasButton.tsx`) |
| Public main component | PascalCase `src/public/<Feature>.tsx` | PascalCase                         |
| Context       | kebab-case `*.context.tsx`               | PascalCase `CanvasThemeContext.tsx`     |
| Custom hook   | `use<Feature>.ts` (see `hooks-conventions`) | `useXxx.ts(x)`                       |
| Props / model / utils | kebab-case `.props.ts`, `.model.ts`, `.utils.ts` | same                    |
| Folder        | camelCase (`beneficiariesFooter/`)       | camelCase (`canvasButton/`)             |

The export is always PascalCase (components) or `useXxx` (hooks). Hook file
extension (`.ts` vs `.tsx`) is owned by `hooks-conventions`.

Reference: [Expo Router — File conventions](https://docs.expo.dev/router/introduction/)
