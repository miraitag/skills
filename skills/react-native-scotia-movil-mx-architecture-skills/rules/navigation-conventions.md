---
title: Navigation (navigator and typed params)
impact: HIGH
impactDescription: typed local stack with per-screen params
tags: presentation, navigation, navigator, params, stack
skill: navigation-conventions
---

## Navigation

**Impact: HIGH**

Rules for `src/private/presentation/navigation/`.

### Structure

```
navigation/
├── international-money-transfer.navigator.tsx   # Local feature stack
└── international-money-transfer.params.ts        # Typed ParamList
```

### Rules

1. **kebab-case names** with a role suffix: `*.navigator.tsx` and `*.params.ts`.
2. **ParamList lives in `*.params.ts`**: the routes → params map is declared
   there (each route with its params or `undefined`), never inline in the
   navigator or screens.
3. **The navigator imports the screens** from `screens/<screen>/<name>.screen`
   (respects `presentation-screen-conventions`).
4. **Local feature stack**: the feature manages its own stack (e.g. `Hub`,
   `NewTransfer`), it does not register the host's global navigation.
5. **No business logic** in the navigator: only route configuration, options,
   and screens.
6. **Feature close** via the host contract (`HostActionDispatcher`), not through
   navigation (see the `CLOSE_FEATURE` behavior).

> **Not here (code-quality `nav-stack-navigator`):** native-stack vs JS stack,
> passing the ParamList as the navigator generic, typed screen props and typed
> `navigate()` calls.

**Detection:**

```bash
# Names off convention
find src/private/presentation/navigation -type f | grep -vE "\.(navigator\.tsx|params\.ts)$"
# Screens imported with a non-standard path
grep -rn "from '../screens/" src/private/presentation/navigation | grep -vE "\.screen'"
# Business logic inside the navigator
grep -rnE "await |Gateway\w*\.|useEffect\(" src/private/presentation/navigation/*.navigator.tsx
```

**Correction:**

1. Move the `ParamList` to `*.params.ts`.
2. Fix screen imports to the `<name>.screen` pattern.
3. Move any business logic from the navigator to a hook/view-model.
4. `pnpm typecheck`.
