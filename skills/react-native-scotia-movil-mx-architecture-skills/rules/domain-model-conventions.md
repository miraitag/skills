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
2. **Structure — main interface + same-name namespace**: the file exports ONE
   main `export interface XDomainModel`. Every auxiliary type that the main
   model needs (nested objects, items of arrays, sub-entities that only exist
   for this model) is declared **below it** in an
   `export namespace XDomainModel { export interface … }` with the **same
   name** (TypeScript declaration merging) and referenced as
   `XDomainModel.Item`. No second top-level interface, no non-exported helper
   interfaces and no inline object types (`{ … }`) inside properties.
   Referencing *another* main domain model from its own file
   (`bank: BankDomainModel`) is allowed. This structure applies to the
   **domain layer only** (data → `data-model-conventions`).
3. **Noun-based names** (see `naming-conventions`).
4. **Purity**: no imports from `data/` or `presentation/`; no API shapes
   (`snake_case`), no React/UI types.
5. **camelCase properties** that represent business concepts.
6. **Transport terms** (`Request`, `Response`, `Payload`, `DTO`, `Dto`,
   `Req`, `Resp`, `Body`, `Json`…) are forbidden in the domain layer, both in
   **file names** and in the **implementation** (any type, namespace, nested
   interface or property name) — audited by `naming-conventions` (§4).
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

**Incorrect (several top-level interfaces, inline object type):**

```ts
// beneficiary.domain-model.ts
export interface BeneficiaryDomainModel {
  accounts: BeneficiaryAccount[];
  address: { city: string; street: string }; // ❌ inline object type
  alias: string;
}

export interface BeneficiaryAccount { // ❌ second top-level interface
  clabe: string;
  holder: string;
}
```

**Correct (main interface + same-name namespace with the nested types):**

```ts
// beneficiary.domain-model.ts
export interface BeneficiaryDomainModel {
  accounts: BeneficiaryDomainModel.Account[];
  address: BeneficiaryDomainModel.Address;
  alias: string;
  bank: BankDomainModel; // ✅ another main domain model, from its own file
}

export namespace BeneficiaryDomainModel {
  export interface Account {
    clabe: string;
    holder: string;
  }

  export interface Address {
    city: string;
    street: string;
  }
}
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

**Detection** (the scanner also checks the main-interface + namespace structure):

```bash
# (file suffix *.domain-model.ts, verbs and transport terms are checked by naming-conventions)
# More than one top-level interface / type in a domain model file
grep -cE "^export (interface|type) " src/private/domain/model/*.domain-model.ts | grep -v ":1$"
# Inline object types inside a domain model
grep -nE "^\s+\w+\??:\s*\{" src/private/domain/model/*.domain-model.ts
grep -rhnE "^export (interface|namespace) \w+" src/private/domain/model/*.domain-model.ts | grep -vE "DomainModel(\s|\{|$)"
grep -rn "from '.*/data/\|from '.*/presentation/" src/private/domain/model
grep -rnE "\w+_\w+:" src/private/domain/model
# Forbidden barrel in domain/model
find src/private/domain/model -name "index.ts" -o -name "index.tsx"
grep -rn "from '.*/domain/model'" src
```

**Correction:**

1. `git mv` to `*.domain-model.ts`; rename the symbol to `XDomainModel`.
2. Move every auxiliary interface (and every inline `{ … }` type) into
   `export namespace XDomainModel { … }` below the main interface and reference
   it as `XDomainModel.Name`.
3. Move any transport shape to the corresponding `*.data-model.ts`.
4. Remove imports from other layers; map at the boundary (gateway/mapper).
5. Remove the barrel `index` and re-point each import to the direct file.
6. `pnpm typecheck`.
