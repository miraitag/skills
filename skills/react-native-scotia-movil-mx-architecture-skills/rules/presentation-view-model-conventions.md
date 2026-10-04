---
title: View-model with gateway ⇒ UI mapper (core rule)
impact: CRITICAL
impactDescription: prevents domain models from the gateway reaching the UI raw
tags: presentation, view-model, gateway, toUiModel, UiState, hook
skill: presentation-view-model-conventions
---

## View-model: gateway ⇒ UI mapper

**Impact: CRITICAL**

Rules for `src/private/presentation/screens/<screen>/<screen>.view-model.ts`.

1. **File**: exactly `<screen>.view-model.ts` (kebab-case, `.ts` — a view-model
   never renders JSX). Forbidden: `<screen>.view.model.ts`,
   `<screen>.view-model.tsx`, `<Screen>ViewModel.ts`, `<screen>.viewmodel.ts`.
   It exposes a hook `use<Screen>ScreenViewModel` that returns a `UiState` +
   actions (never a `<Screen>ViewModel()` function without the `use` prefix).
2. **CORE RULE — gateway ⇒ UI mapper**: every view-model that consumes the
   gateway and exposes data to the screen MUST map each domain result to a UI
   model via a UI mapper (`toUiModel`). Never store a raw `XDomainModel` from
   the gateway in `UiState`.
   - Reads that return data → map with `AlgoToUiMapper.toUiModel`
     (use `.map(...)` for arrays).
   - Writes that return `Result<void>` are exempt (there is no data to render).
3. **UiState contains only UI models** (`XUiModel`), never domain/data models.
4. **Side-effects, loading, and async** live in the hook — not in the screen.

**Incorrect:**

```ts
setUiState((s) => ({ ...s, transferAccounts: result.value })); // ❌ raw domain
```

**Correct:**

```ts
setUiState((s) => ({
  ...s,
  transferAccounts: result.value.map(TransferAccountsToUiMapper.toUiModel), // ✅
}));
```

**Detection:**

```bash
# View-model file name off convention
find src/private/presentation -iname "*view*model*" ! -name "*.view-model.ts"
grep -rnE "export (const|function) [A-Z]\w*ViewModel\b" src/private/presentation
grep -rln "useInternationalMoneyTransferGateway\|Gateway()" src/private/presentation/screens/**/*.view-model.ts*
grep -rnE "\.value(\s|,|;|\))" src/private/presentation/screens/**/*.view-model.ts* | grep -v "toUiModel\|Mapper"
grep -rn "DomainModel" src/private/presentation/screens/**/*.ui-state.ts
```

**Correction:**

1. `git mv` to `<screen>.view-model.ts`, rename the hook to
   `use<Screen>ScreenViewModel`, update imports.
2. For each gateway read result stored in state, create/locate a UI mapper and
   apply `toUiModel`.
3. If the `XUiModel` and the UI mapper do not exist, create them (see
   `presentation-ui-model-conventions` and `presentation-ui-mapper-conventions`).
4. Change the `UiState` fields to the UI model types.
5. `pnpm typecheck` + `pnpm lint`.
