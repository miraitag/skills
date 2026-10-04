---
title: Screen name and responsibility
impact: CRITICAL
impactDescription: route consistency and render/logic separation
tags: presentation, screen, screen.tsx, view
skill: presentation-screen-conventions
---

## Screens: name and responsibility

**Impact: CRITICAL**

Rules for screen components under
`src/private/presentation/screens/<screen>/`.

1. **File**: `<name>.screen.tsx` in kebab-case. E.g.: `beneficiary.screen.tsx`,
   `beneficiary-detail.screen.tsx`, `calculate-transfer.screen.tsx`.
   - Forbidden: `PascalCaseScreen.tsx`, `name-screen.tsx` (hyphen instead of
     dot), `Screen.tsx`.
2. **Screens render, view-models decide**: async/loading/side-effects live in
   the view-model hook, not in the component.
3. Screens consume UI models (`XUiModel`) from the view-model, never domain or
   data models directly.

**Incorrect:**

```
BeneficiariesScreen.tsx     ❌ PascalCase
ticket-screen.tsx           ❌ hyphen instead of dot
```

**Correct:**

```
beneficiaries.screen.tsx    ✅
ticket.screen.tsx           ✅
beneficiary-detail.screen.tsx ✅
```

**Detection:**

```bash
# Screen files not ending in .screen.tsx (file case is checked by conv-kebab-case-files)
find src/private/presentation/screens -name "*creen*.tsx" ! -name "*.screen.tsx"
grep -rn "DomainModel\|DataModel" src/private/presentation/screens/**/*.screen.tsx
# Side effects in the screen (gateway calls belong to the view-model)
grep -rnE "Gateway\w*\.\w+\(|new \w+GatewayImpl\(" src/private/presentation/screens/**/*.screen.tsx
```

**Correction:**

1. `git mv` to `<name>.screen.tsx` (kebab-case) and update the navigator.
2. Move gateway/side-effects logic to the view-model.
3. Replace direct use of domain/data models with UI models from the view-model.
4. `pnpm typecheck`.
