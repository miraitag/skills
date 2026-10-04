---
title: Domain gateway interface
impact: HIGH
impactDescription: stable contract with Result and references only to domain models
tags: domain, gateway, interface, contract, Result, ServiceError
skill: domain-gateway-conventions
---

## Domain gateway interface

**Impact: HIGH**

Rules for `src/private/domain/gateway/*.gateway.ts`. Defines the contract that
the data layer implements.

1. **File**: `*.gateway.ts` under `src/private/domain/gateway/`.
2. **Interface only** — no implementation (that lives in `*.gateway.impl.ts`).
3. **Methods = operations** and DO use verbs: `getAccounts`, `searchBanks`.
4. **Parameters and returns reference ONLY domain models** (`XDomainModel`) —
   never data models or UI models.
5. **Return** always `Promise<Result<T, ServiceError>>` where `T` is a domain
   model, `domain model[]`, or `void` for writes.

**Incorrect:**

```ts
getAccounts(): Promise<AccountsDataModel.Response.Payload>;   // ❌ data model + no Result
```

**Correct:**

```ts
getAccounts(): Promise<Result<AccountDomainModel[], ServiceError>>;   // ✅
```

**Detection:**

```bash
grep -rn "DataModel\|UiModel" src/private/domain/gateway
grep -rn "from '.*/data/\|from '.*/presentation/" src/private/domain/gateway
grep -rnE "\):\s*Promise<" src/private/domain/gateway | grep -v "Result<"
```

**Correction:**

1. Replace every `DataModel`/`UiModel` reference with its domain equivalent.
2. Ensure `Promise<Result<DomainType, ServiceError>>` in every method.
3. Keep the verbs in the methods (correct, unlike in models).
4. `pnpm typecheck`.
