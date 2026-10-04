---
title: Data mappers (toDomainModel / toDataModel)
impact: HIGH
impactDescription: keeps the mapping directionality and a minimal public API
tags: data, mapper, toDomainModel, toDataModel, transform
skill: data-mapper-conventions
---

## Data mappers

**Impact: HIGH**

Rules for `src/private/data/mapper/*.mapper.ts`.

### Direction and layer of each mapper

| Mapper          | Layer where it lives          | From → To         | When                                    |
| --------------- | ----------------------------- | ----------------- | --------------------------------------- |
| `toDataModel`   | data                          | Domain → API DTO  | When **sending** data to the backend    |
| `toDomainModel` | data                          | API DTO → Domain  | When **receiving** the backend response |
| `toUiModel`     | presentation                  | Domain → UI Model | When **displaying** data on a screen    |

- In the **data** layer only `toDomainModel` and `toDataModel` live. `toUiModel`
  NEVER lives here (it belongs to presentation).
- Presentation also has a `toDataModel`, but in the other step of the chain:
  UI / form → domain (gateway input). See `presentation-ui-mapper-conventions`.
  Only the **data** `toDataModel` produces API DTOs.

1. **File**: `*.mapper.ts` — the name reflects only the concept/operation
   (`accounts.mapper.ts`, `search-banks.mapper.ts`). No `-data-model`,
   `-domain-model`, `-request`, `-response`, or `-ui` in the name.
2. **Public API**: the mapper object exports ONLY `toDomainModel` and/or
   `toDataModel`.
   - `toDomainModel(dataModel) -> domainModel` (response → domain).
   - `toDataModel(domainModel) -> dataModel` (domain → request payload).
3. **Private helpers**: sub-mappers (`toAmountModel`, etc.) are private module
   functions, never exported.
4. **Direction**: they translate between `XDataModel` and `XDomainModel`. They
   do NOT produce UI models (`toUiModel` belongs to presentation).
5. **Not always 1:1**: the implementation depends on the requirement, the shape
   of the data, and the domain. A mapper can omit fields, derive, combine,
   group, or flatten; what is mandatory is the **contract name**
   (`toDomainModel`/`toDataModel`), not a field-by-field correspondence.
6. **Mappers CAN contain actions/verbs** in their functions (helpers such as
   `toAmount`, `normalize`, `mask`, `sort`) because a mapper is an operation,
   not a model. The noun-based naming restriction applies to **models**, not to
   mappers.

**Incorrect:**

```ts
export const CountryMapper = {
  toModel(...) { ... },        // ❌ non-standard name
  toDataModel(...) { ... },    // ❌ actually produces domain, mislabeled
};
```

**Correct:**

```ts
function toCountry(...) { ... }          // ✅ private helper
export const CountryMapper = {
  toDomainModel(...) { ... },            // ✅ only the standard contract
};
```

**Detection:**

```bash
grep -rnE "^\s*(export const \w+ = \{|to[A-Z]\w+)" src/private/data/mapper | grep -vE "toDomainModel|toDataModel"
find src/private/data/mapper -name "*model*.mapper.ts" -o -name "*request*.mapper.ts" -o -name "*response*.mapper.ts"
grep -rn "UiModel\|toUiModel" src/private/data/mapper
grep -rnE "^export " src/private/data/mapper
```

**Correction:**

1. Rename methods to `toDomainModel`/`toDataModel`; make helpers private.
2. `git mv` to a clean `*.mapper.ts`; update the gateway impl.
3. `pnpm typecheck` + `pnpm lint --fix`.
