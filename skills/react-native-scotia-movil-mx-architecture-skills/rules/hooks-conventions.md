---
title: Hooks (when to create them, name, and location)
impact: HIGH
impactDescription: encapsulates state and effects outside the view, with a consistent name and location
tags: presentation, hooks, useX, view-model, custom-hook
skill: hooks-conventions
---

## Hooks: when, name, and location

**Impact: HIGH**

### When to create/implement a hook

Create a hook when you need **state, effects, or logic with a React lifecycle**
that is reusable or separable from the view:

- Orchestrate gateway data and expose `UiState` + actions to a screen →
  **view-model hook**.
- Encapsulate a component's state/selection/validation → **component hook**.
- Access a provider contract (context) with a guard → **context hook**.
- Derive UI props from the host state → **transformation hook**.

If the logic is **pure and stateless**, it is NOT a hook: it goes in `utils/`
(see `utils-conventions`).

### Name and location rules

| Type                        | Function name                | File                      | Location                                                    |
| --------------------------- | ---------------------------- | ------------------------- | ----------------------------------------------------------- |
| Screen view-model           | `use<Screen>ScreenViewModel` | `<screen>.view-model.ts`  | `screens/<screen>/`                                         |
| Component/screen hook       | `use<Feature>`               | `use<Feature>.ts`         | `screens/<screen>/hooks/` or `.../components/<comp>/hooks/` |
| Hook shared across screens  | `use<Feature>`               | `use<Feature>.ts`         | `screens/components/hooks/`                                 |
| Context hook (contract)     | `use<Contract>`              | `use<Contract>.ts`        | `presentation/contexts/hooks/`                              |
| host→UI transformation hook | `use<Data>To<Screen>`        | `use<Data>To<Screen>.ts`  | `presentation/contexts/hooks/`                              |

Cross-cutting rules:

1. **`use` prefix + camelCase** in the function; the file name mirrors the
   function name (view-models are the exception: `<screen>.view-model.ts`).
2. **Extension**: `.ts` if there is no JSX; `.tsx` only if it returns/uses JSX.
3. **Typed return**: view-models return an explicit interface
   (`{ uiState, ...actions }`); context hooks return the contract directly.

> This rule is the single owner of hook **naming, location and extension** for
> both packages. Not here (code-quality): Rules of Hooks / conditional calls
> (`state-rules-of-hooks`), the context guard (`state-context-api`) and
> extracting duplicated stateful logic (`state-custom-hook`).

**Detection:**

```bash
# Hooks whose name does not start with use
grep -rnE "export (const|function) [a-z]\w*\s*=?\s*\(" $(find src/private/presentation -name "use*.ts*") | grep -vE "\buse[A-Z]"
# use*.tsx files without JSX (should be .ts)
for f in $(find src/private/presentation -name "use*.tsx"); do grep -q "</\|<[A-Z]\|return (" "$f" || echo "maybe .ts: $f"; done
# Hooks outside the allowed locations
find src/private/presentation -name "use*.ts*" ! -path "*/hooks/*" ! -name "*.view-model.ts"
```

**Correction:**

1. Rename to `use<Feature>` (function and file).
2. Move to the `hooks/` folder corresponding to the scope (screen, component,
   shared, or context).
3. Change `.tsx`→`.ts` if there is no JSX.
4. If the logic is pure, convert it to a util in `utils/`.
5. `pnpm typecheck` + `pnpm lint`.
