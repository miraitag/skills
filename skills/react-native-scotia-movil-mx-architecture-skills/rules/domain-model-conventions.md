---
title: Pure domain models
impact: HIGH
impactDescription: keeps the domain framework-agnostic and free of external-layer dependencies
tags: domain, model, entity, DomainModel, purity
skill: domain-model-conventions
---

## Pure domain models

**Impact: HIGH**

Rules for `src/private/domain/model/*.domain-model.ts`. Domain models are pure
TypeScript types, unaware of transport (API) or UI.

1. **File**: `*.domain-model.ts` under `src/private/domain/model/`.
2. **Symbol**: `XDomainModel` (interface, optionally with `namespace
XDomainModel` for nested types).
3. **Noun-based names** (see `naming-conventions`).
4. **Purity**: no imports from `data/` or `presentation/`; no API shapes
   (`snake_case`), no React/UI types.
5. **camelCase properties** that represent business concepts.
6. **Transport terms** (`Request`, `Response`, `Payload`, `DTO`) are forbidden
   in domain names — audited by `naming-conventions` (§4), not here.
7. **No barrel index**: do NOT create an `index.ts`/`index.tsx` barrel in
   `src/private/domain/model/`. Each consumer imports directly from the model
   file (`../model/beneficiary.domain-model`), not from `../model`. The barrel
   adds an unnecessary re-export, hides the real origin of the type, and eases
   dependency cycles.

**Incorrect:**

```ts
// src/private/domain/model/index.ts  ❌ unnecessary barrel
export type { BeneficiaryDomainModel } from './beneficiary.domain-model';

// consumer
import type { BeneficiaryDomainModel } from '../model'; // ❌ via barrel
```

**Correct:**

```ts
// consumer — direct import to the model file
import type { BeneficiaryDomainModel } from '../model/beneficiary.domain-model'; // ✅
```

**Incorrect:**

```ts
// create-beneficiary.model.ts
export interface CreateBeneficiaryModel {
  bank: BankDataModel; // ❌ data layer import
  given_name: string; // ❌ transport snake_case
}
```

**Correct:**

```ts
// beneficiary-creation.domain-model.ts
export interface BeneficiaryCreationDomainModel {
  bank: BankDomainModel; // ✅ only domain models
  givenName: string; // ✅ domain camelCase
}
```

**Detection:**

```bash
# (file suffix *.domain-model.ts is checked by naming-conventions)
grep -rhnE "^export (interface|namespace) \w+" src/private/domain/model/*.domain-model.ts | grep -vE "DomainModel(\s|\{|$)"
grep -rn "from '.*/data/\|from '.*/presentation/" src/private/domain/model
grep -rnE "\w+_\w+:" src/private/domain/model
# Forbidden barrel in domain/model
find src/private/domain/model -name "index.ts" -o -name "index.tsx"
grep -rn "from '.*/domain/model'" src
```

**Correction:**

1. `git mv` to `*.domain-model.ts`; rename the symbol to `XDomainModel`.
2. Move any transport shape to the corresponding `*.data-model.ts`.
3. Remove imports from other layers; map at the boundary (gateway/mapper).
4. Remove the barrel `index` and re-point each import to the direct file.
5. `pnpm typecheck`.
