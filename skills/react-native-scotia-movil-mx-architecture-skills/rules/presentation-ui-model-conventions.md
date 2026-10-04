---
title: UI models (view shape)
impact: CRITICAL
impactDescription: the view consumes its own types, decoupled from the domain
tags: presentation, ui-model, UiModel, view
skill: presentation-ui-model-conventions
---

## UI models (view shape)

**Impact: CRITICAL**

Rules for `src/private/presentation/screens/<screen>/model/*.ui-model.ts`.

1. **File**: `*.ui-model.ts` in the screen's `model/` folder.
   Forbidden: `-ui.model.ts`, `.model.ts`. A screen's `<feature>.model.ts` only
   holds the form value map (`<Feature>FormFields`); component-local models use
   `<comp>.model.ts` inside the component folder. Runtime form descriptors are UI
   models too (`<Feature>FieldUiModel` in `<feature>-field.ui-model.ts`).
2. **Symbol**: `XUiModel` (interface or namespace).
3. **Noun-based names** (see `naming-conventions`): `BeneficiaryCountryUiModel`,
   `TransferAmountsUiModel`, not `SelectBeneficiaryCountryUiModel`/
   `CalculateTransferAmountsUiModel`.
4. **View shape**: contains exactly what the screen renders (already
   formatted/derived fields). It is NOT a copy of the domain model — it omits
   fields the UI does not use and adds display-only fields.
5. **No imports from data/domain**: the conversion happens in the UI mapper.

**Incorrect:**

```
beneficiary-ui.model.ts     ❌ legacy suffix
export interface SelectBeneficiaryCountryUiModel { ... }   // ❌ Select verb
```

**Correct:**

```
beneficiary.ui-model.ts     ✅
export interface BeneficiaryCountryUiModel { ... }         // ✅
```

**Detection:**

```bash
# (legacy -ui.model.ts and verb names are checked by naming-conventions)
# UI models stored in a generic .model.ts (only FormFields / component-local models go there)
grep -lE "export (interface|namespace|type) \w*UiModel" src/private/presentation/screens/*/model/*.model.ts
grep -rhnE "^export (interface|namespace) \w+" src/private/presentation/screens/**/model/*.ui-model.ts | grep -vE "UiModel(\s|\{|$)"
```

**Correction:**

1. `git mv` to `*.ui-model.ts` with a noun-based name.
2. Rename the symbol to `XUiModel`; update the UI mapper and view-model.
3. `pnpm typecheck`.
