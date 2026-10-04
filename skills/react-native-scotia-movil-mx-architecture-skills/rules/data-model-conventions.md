---
title: Data models (transport shape)
impact: HIGH
impactDescription: isolates API shapes within the data layer
tags: data, model, api, DataModel, request, response, payload
skill: data-model-conventions
---

## Data models (transport shape)

**Impact: HIGH**

Rules for `src/private/data/api/model/*.data-model.ts`.

1. **File**: `*.data-model.ts` under `src/private/data/api/model/`.
2. **Structure — namespaces when there is a Request and/or Response**: if the
   model describes a request and/or a response, the main symbol is
   `export namespace XDataModel`, and inside it `export namespace Request`
   and/or `export namespace Response` — **namespaces, never interfaces or type
   aliases** — each containing its interfaces (`Payload`, plus one nested
   interface per nested object or array item). No inline object types
   (`{ … }`) in properties, no `XRequest` / `XResponse` symbols outside the main
   namespace, and no second top-level symbol in the file. This structure
   applies to the **data layer only** (domain → `domain-model-conventions`).
3. **Noun-based names** (see `naming-conventions`): `AccountsDataModel`,
   `BeneficiaryCreationDataModel`, not `GetAccounts`/`CreateBeneficiary`.
4. **Reflect the transport shape**: the API's `snake_case` fields are allowed
   and expected HERE (the only layer where transport shapes live).
5. **No imports from domain/UI**.
6. Typical organization: `XDataModel.Request.Payload`,
   `XDataModel.Response.Payload`, and nested interfaces such as
   `XDataModel.Response.Account`. A transport fragment with neither request nor
   response (shared shape) may be a plain `export interface XDataModel`.

**Incorrect:**

```ts
// get-accounts.response.ts
export namespace GetAccounts { ... }          // ❌ suffix and verbal name
```

```ts
// beneficiary-creation.data-model.ts
export interface BeneficiaryCreationRequest {      // ❌ Request outside the main namespace
  alias: string;
}
export namespace BeneficiaryCreationDataModel {
  export interface Response {                      // ❌ Response must be a namespace
    beneficiary: { beneficiary_id: string };       // ❌ inline object type
  }
}
```

**Correct:**

```ts
// accounts.data-model.ts
export namespace AccountsDataModel {
  export namespace Response {
    export interface Payload {
      accounts: Account[]; // ✅ nested interface, snake_case allowed below
    }

    export interface Account {
      account_id: string;
      balance: number;
    }
  }
}

// beneficiary-creation.data-model.ts
export namespace BeneficiaryCreationDataModel {
  export namespace Request {
    export interface Payload {
      account_number: string;
      alias: string;
    }
  }

  export namespace Response {
    export interface Payload {
      beneficiary: Beneficiary;
    }

    export interface Beneficiary {
      beneficiary_id: string;
    }
  }
}
```

**Detection:**

```bash
# (file suffix *.data-model.ts is checked by naming-conventions)
grep -rhnE "^export namespace \w+" src/private/data/api/model/*.data-model.ts | grep -vE "DataModel\s*\{"
grep -rn "from '.*/domain/\|from '.*/presentation/" src/private/data/api/model
# Request / Response declared as interface or type (must be namespaces) or outside the main namespace
grep -rnE "(interface|type) \w*(Request|Response)\b" src/private/data/api/model
# Inline object types in data models
grep -nE "^\s+\w+\??:\s*\{" src/private/data/api/model/*.data-model.ts
```

**Correction:**

1. `git mv` to `*.data-model.ts` with a noun-based name.
2. Rename the namespace to `XDataModel`; turn `Request` / `Response` into
   nested namespaces with a `Payload` interface and one interface per nested
   object; update mappers and gateway impl.
3. Remove imports from other layers.
4. `pnpm typecheck`.
