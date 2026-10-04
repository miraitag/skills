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
   - If the `XUiModel` or the UI mapper does not exist yet, **create both**
     (`model/<concept>.ui-model.ts` + `mapper/<concept>.mapper.ts`). Never copy
     domain fields into the state one by one (`name: result.value.name`): that
     is an inline mapper.
3. **CORE RULE (inverse) — sending data ⇒ `toDataModel`**: when the view-model
   sends data through the gateway (create / update / post), it never builds the
   gateway input inline (object literal, spread of the form fields, picking
   fields). It calls the screen's mapper `XMapper.toDataModel(formFields |
   uiModel)`, which returns the **domain model the gateway method expects**,
   and passes that result. Create the mapper method (and the domain input model,
   if missing) following `presentation-ui-mapper-conventions`. The data layer
   then converts that domain model into the API request with its own
   `toDataModel` (`data-gateway-impl-conventions`).
4. **UiState contains only UI models** (`XUiModel`), never domain/data models.
5. **Side-effects, loading, and async** live in the hook — not in the screen.

**Incorrect:**

```ts
setUiState((s) => ({ ...s, transferAccounts: result.value })); // ❌ raw domain
```

```ts
setUiState((s) => ({ ...s, holderName: result.value.holder.name })); // ❌ inline mapping
await beneficiaryGateway.createBeneficiary({ alias: formFields.alias, clabe: formFields.clabe }); // ❌ inline request
```

**Correct:**

```ts
setUiState((s) => ({
  ...s,
  transferAccounts: result.value.map(TransferAccountsToUiMapper.toUiModel), // ✅
}));

// mapper/beneficiary-creation.mapper.ts
export const BeneficiaryCreationMapper = {
  toDataModel({
    alias,
    clabe,
  }: BeneficiaryCreationModel.BeneficiaryCreationFormFields): BeneficiaryCreationDomainModel {
    return { alias, clabe };
  },
};

// view-model
const beneficiary = BeneficiaryCreationMapper.toDataModel(formFields); // ✅
const result = await beneficiaryGateway.createBeneficiary(beneficiary);
```

**Detection:**

```bash
# View-model file name off convention
find src/private/presentation -iname "*view*model*" ! -name "*.view-model.ts"
grep -rnE "export (const|function) [A-Z]\w*ViewModel\b" src/private/presentation
grep -rln "useInternationalMoneyTransferGateway\|Gateway()" src/private/presentation/screens/**/*.view-model.ts*
grep -rnE "\.value(\s|,|;|\))" src/private/presentation/screens/**/*.view-model.ts* | grep -v "toUiModel\|Mapper"
grep -rn "DomainModel" src/private/presentation/screens/**/*.ui-state.ts
# Domain fields copied one by one into the state (inline mapping)
grep -rnE "\.value\.\w+" src/private/presentation/screens/**/*.view-model.ts | grep -v "toUiModel\|Mapper\|\.value\.(length|map)"
# Gateway input built inline (object literal / spread) instead of Mapper.toDataModel
grep -rnE "[gG]ateway\w*\.\w+\(\s*(\{|\.\.\.)" src/private/presentation/screens/**/*.view-model.ts
```

**Correction:**

1. `git mv` to `<screen>.view-model.ts`, rename the hook to
   `use<Screen>ScreenViewModel`, update imports.
2. For each gateway read result stored in state, create/locate a UI mapper and
   apply `toUiModel` (create the `XUiModel` and the mapper if they do not exist).
3. For each write, create/locate `XMapper.toDataModel` (form fields / UI model
   → domain input of the gateway) and pass its result to the gateway.
4. Change the `UiState` fields to the UI model types.
5. `pnpm typecheck` + `pnpm lint`.
