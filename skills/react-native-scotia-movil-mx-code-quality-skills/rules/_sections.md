# Sections

Defines the rule categories, their order, impact level, and description.
The section ID (in parentheses) is the file prefix used to group rules.

---

## 1. Components (components)

**Impact:** CRITICAL
**Description:** Fundamental React Native component patterns. Violations cause
production crashes or incorrect visual behavior.

## 2. TypeScript (ts)

**Impact:** HIGH
**Description:** Correct typing for props, generics, and native modules for
early compile-time error detection; interface / type members in alphabetical
order; props and params destructured in the signature (same order, no
`...rest`).

## 3. State and Hooks (state)

**Impact:** HIGH
**Description:** Correct patterns for useState, useEffect, useCallback,
useMemo, useRef, Context, provider-owned reactive state, custom hooks, the
Rules of Hooks, focus effects, and cancellation of async updates. Avoids memory leaks and unnecessary re-renders.

## 4. Styles (styles)

**Impact:** MEDIUM
**Description:** StyleSheet.create, responsive Flexbox, Platform.select, typed
style inputs, and a single style passed without an array.

## 5. Lists (lists)

**Impact:** HIGH
**Description:** Virtualization with FlatList and SectionList. ScrollView with
map is an anti-pattern that freezes the UI with large lists.

## 6. Performance (perf)

**Impact:** HIGH
**Description:** React.memo, avoiding components defined inside components, and
hoisting static JSX to eliminate unnecessary renders.

## 7. APIs and Data (api)

**Impact:** MEDIUM
**Description:** Typed fetches, parallel fetches, Context + useReducer, runtime
permissions, community modules, NativeModules, and forms with Yup and React
Hook Form.

## 8. Navigation (nav)

**Impact:** HIGH
**Description:** Native Stack Navigator with TypeScript for smooth transitions
on the operating system UI thread.

## 9. Animations (anim)

**Impact:** HIGH
**Description:** Animate only transform and opacity with Reanimated to keep
60 fps without recalculating layout on every frame.

## 10. Conventions (conv)

**Impact:** MEDIUM
**Description:** M3 design tokens (single owner of hardcoded colors),
ThemeProvider, pnpm, native permissions, and **DEV** guards.

> Ownership: every check lives in exactly one rule of one package. File/symbol
> names (including the hook `use` prefix), folders, file locations and layer
> boundaries are audited by `react-native-scotia-movil-mx-architecture-skills`.
> Rules whose library is not installed are reported as N/A by the scanner.
