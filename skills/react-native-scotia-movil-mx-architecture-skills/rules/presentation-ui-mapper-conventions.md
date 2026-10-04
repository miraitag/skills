---
title: UI mappers (toUiModel)
impact: CRITICAL
impactDescription: one-way domain → UI translation with a minimal public API
tags: presentation, ui-mapper, toUiModel, transform
skill: presentation-ui-mapper-conventions
---

## UI mappers

**Impact: CRITICAL**

Rules for `src/private/presentation/screens/<screen>/mapper/*.mapper.ts`.

### Direction and layer of each mapper

| Mapper          | Layer where it lives          | From → To         | When                                    |
| --------------- | ----------------------------- | ----------------- | --------------------------------------- |
| `toUiModel`     | presentation | Domain → UI Model | When **displaying** gateway data on a screen |
| `toDataModel`   | presentation | UI model / form fields → Domain (gateway input) | When the view-model **sends** data through the gateway |
| `toDataModel`   | data         | Domain → API DTO (`XDataModel.Request.Payload`) | Inside the gateway implementation |
| `toDomainModel` | data         | API DTO → Domain  | When **receiving** the backend response |

- A screen's mapper exposes `toUiModel` (reads) and/or `toDataModel` (writes).
  The presentation `toDataModel` produces the **domain model the gateway method
  expects** — it NEVER produces or imports data models (`XDataModel`); the
  data layer turns that domain model into the API request.
- `toDomainModel` NEVER lives in presentation (it belongs to data).

1. **File**: `*.mapper.ts` — a concept/operation name (`currency.mapper.ts`,
   `transfer-account.mapper.ts`). No `-ui-model`, `-ui`, or any other model
   suffix in the name.
2. **Public API**: exports ONLY `toUiModel` and/or `toDataModel` (via a mapper
   object or exported functions).
   - `toUiModel(domainModel) -> uiModel`.
   - `toDataModel(formFields | uiModel) -> domainModel` (gateway input).
3. **Private helpers**: sub-mappers (`toAmountUiModel`, `maskBankAccountNumber`,
   etc.) stay private to the module.
4. **Direction**: `XDomainModel` → `XUiModel` (`toUiModel`) and
   UI / form → `XDomainModel` (`toDataModel`). They do NOT produce or import
   data models.
5. Static UI lists (not transformations) do NOT go in `mapper/` — move them to a
   constants/values file.
6. **Not always 1:1**: the implementation depends on the screen's requirement. A
   `toUiModel` can omit domain fields the view does not use, add display-only
   fields, format, mask, or derive. What is mandatory is the **contract name**
   (`toUiModel`), not a field-by-field correspondence.
7. **Mappers CAN contain actions/verbs** in their helpers (`mask`, `format`,
   `sort`) because a mapper is an operation, not a model. The noun-based naming
   rule applies to **models**, not to mappers.

**Incorrect:**

```
currency-ui-model.mapper.ts   ❌ model suffix in the name
export const toTicketModel = (...) => ...    // ❌ non-standard name
```

**Correct:**

```
currency.mapper.ts            ✅
export const toUiModel = (...) => ...        // ✅
```

**Detection:**

```bash
grep -rnE "export (const \w+|function to[A-Z]\w+|const to[A-Z]\w+)" src/private/presentation/screens/**/mapper/*.mapper.ts | grep -vE "toUiModel"
find src/private/presentation/screens -path "*/mapper/*" -name "*ui-model*.mapper.ts" -o -path "*/mapper/*" -name "*-ui.mapper.ts"
grep -rn "DataModel" src/private/presentation/screens/**/mapper
grep -rlnE "^export const \w+: \w+\[\] = \[" src/private/presentation/screens/**/mapper
```

**Correction:**

1. Rename the mapping function to `toUiModel`; make helpers private.
2. `git mv` to a clean `*.mapper.ts` and update imports.
3. Move static data arrays out of `mapper/`.
4. `pnpm typecheck` + `pnpm lint --fix`.
