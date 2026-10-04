---
title: Gateway implementation (HTTP → mapper → domain flow)
impact: HIGH
impactDescription: avoids data model leaks and centralizes mapping in the data layer
tags: data, gateway, impl, http, mapper, Result
skill: data-gateway-impl-conventions
---

## Gateway implementation

**Impact: HIGH**

Rules for `src/private/data/gateway/*.gateway.impl.ts`.

1. **File**: `*.gateway.impl.ts` under `src/private/data/gateway/`.
2. **Implements the domain interface** exactly (same names/signatures).
3. **Flow per method**:
   - Call the HTTP client (for writes, with `Mapper.toDataModel(input)`).
   - Receive `XDataModel.Response.Payload`.
   - Convert to domain with `Mapper.toDomainModel(response)`.
   - Return `Result.success(domain)` or `Result.failure(serviceError)`.
4. **Returns only domain models** — never leaks data models to the caller.
5. All mapping goes through a data mapper; no inline transport→domain
   transformation inside the impl.
6. **Write requests (`post` / `put` / `patch`, or `body` / `data` of a request)
   always send a data model built by the mapper**:
   `Mapper.toDataModel(domainInput)` returning `XDataModel.Request.Payload`.
   Never an object literal, a spread of the domain input, or a domain model sent
   as-is. If the mapper or the `Request` type does not exist, create them
   following `data-mapper-conventions` / `data-model-conventions`.

**Incorrect:**

```ts
const response = await http.get(...);
return Result.success({ id: response.data.account_id });   // ❌ inline mapping
```

**Correct:**

```ts
const response = await http.get(...);
return Result.success(AccountsMapper.toDomainModel(response.data));   // ✅
```

**Incorrect (write request built inline):**

```ts
async createBeneficiary(beneficiary: BeneficiaryCreationDomainModel) {
  const response = await http.post('/beneficiaries', {
    alias: beneficiary.alias,                // ❌ object literal as request
    account_number: beneficiary.accountNumber,
  });
  // also ❌: http.post(url, beneficiary)  → domain model sent as-is
  // also ❌: http.post(url, { ...beneficiary, channel: 'APP' })
}
```

**Correct (request built by the data mapper):**

```ts
// data/mapper/beneficiary-creation.mapper.ts
export const BeneficiaryCreationMapper = {
  toDataModel(
    beneficiary: BeneficiaryCreationDomainModel
  ): BeneficiaryCreationDataModel.Request.Payload {
    return { account_number: beneficiary.accountNumber, alias: beneficiary.alias };
  },
};

// data/gateway/beneficiary.gateway.impl.ts
async createBeneficiary(beneficiary: BeneficiaryCreationDomainModel) {
  const request = BeneficiaryCreationMapper.toDataModel(beneficiary); // ✅
  const response = await http.post<BeneficiaryCreationDataModel.Response.Payload>(
    '/beneficiaries',
    request
  );
  return Result.success(BeneficiaryCreationMapper.toDomainModel(response.data));
}
```

**Detection:**

```bash
grep -rn "DataModel" src/private/data/gateway/*.impl.ts | grep -v "Mapper\|import"
grep -rnE "return (?!Result)" src/private/data/gateway/*.impl.ts
grep -rn "response.data" src/private/data/gateway/*.impl.ts
# Write requests whose body is not built by toDataModel (review each hit)
grep -rnE "\.(post|put|patch)(<[^>]*>)?\(" src/private/data/gateway/*.impl.ts | grep -v "toDataModel"
grep -rnE "(body|data):[[:space:]]*(\{|JSON\.stringify\([[:space:]]*\{)" src/private/data/gateway/*.impl.ts
```

**Correction:**

1. Route all transport→domain conversion through `toDomainModel`.
2. Route all domain→request conversion through `toDataModel`: create the
   `XDataModel.Request.Payload` type and the mapper method if missing, then pass
   `const request = XMapper.toDataModel(input)` to the HTTP call.
3. Ensure all returns are `Result.success/failure` with domain payloads.
4. `pnpm typecheck`.
