---
title: Naming conventions (files, symbols, and clean naming)
impact: HIGH
impactDescription: cross-layer consistency and noun-based Clean Architecture names
tags: naming, rename, clean-architecture, model-suffix, verb, noun
skill: naming-conventions
---

## Naming conventions (Cross-cutting)

**Impact: HIGH**

Base naming rules shared by all layers. Models use file and symbol suffixes per
layer, and **noun-based** names that describe the concept — never the operation.

### 1. Model file suffixes

| Layer                 | Suffix             | Example                       |
| --------------------- | ------------------ | ----------------------------- |
| Presentation UI model | `.ui-model.ts`     | `beneficiary.ui-model.ts`     |
| Data model            | `.data-model.ts`   | `accounts.data-model.ts`      |
| Domain model          | `.domain-model.ts` | `beneficiary.domain-model.ts` |

Forbidden legacy forms: `-ui.model.ts`, `.model.ts`, `.response.ts`,
`-model.ts`, `.request.model.ts`.

### 2. Symbol suffixes

- UI model → `XUiModel`
- Data model → `XDataModel`
- Domain model → `XDomainModel`

The suffix must match the layer that **declares** the symbol: `XDomainModel`
only under `domain/`, `XDataModel` only under `data/`, `XUiModel` only under
`presentation/` (e.g. a dynamic-form descriptor in a screen is
`XFieldUiModel`, never `XCreationDomainModel.FieldUiModel`).

### 3. Noun-based names (no action verbs)

Following Clean Architecture, a **model is a noun** (the concept), never an
action. This applies to the **file name** and to **every declaration inside the
file** — main interface / namespace and nested namespaces / interfaces.

| Layer | Applies |
| --- | --- |
| Domain (`*.domain-model.ts`) | Always |
| Data (`*.data-model.ts`) | Always |
| UI (`*.ui-model.ts`) | By default; a UI model may use a verb only when its purpose requires it (e.g. it describes an action button of the view) |

Exceptions — a business rule names the concept with a verb, or the noun form
would collide with an existing model — are recorded explicitly: in
`model_verb_exceptions` of `.scotia-audit/profile.md` (comma-separated symbol or
file names) or by skipping the finding into the baseline. Never silently.

**Incorrect:**

```
get-accounts.data-model.ts          export namespace GetAccountsDataModel
create-beneficiary.domain-model.ts  export interface CreateBeneficiaryDomainModel
search-banks.ui-model.ts            export interface SearchBanksUiModel
                                    export namespace AccountsDataModel { export interface GetBalance … }
```

**Correct:**

```
accounts.data-model.ts               AccountsDataModel
beneficiary-creation.domain-model.ts BeneficiaryCreationDomainModel
bank-search.ui-model.ts              BankSearchUiModel
Accounts  BeneficiaryCreation  BeneficiaryDeletion  BankSearch  FieldValidation  BeneficiaryCountry  Balance
```

Legitimate nouns that are kept: `BankSearchParams`, `ExchangeRateQuery`,
`TransferConfiguration`, `BeneficiaryDeletionParams`.

> **Applies to the MODELS of each layer** (domain, data, and UI): none should
> contain action verbs unless the verb is strictly part of the business
> concept. The consideration is per layer: the same concept is named
> `XDomainModel` / `XDataModel` / `XUiModel`, always in noun form.

> **Exception — mappers and gateway methods** (`getCurrencies`, `searchBanks`,
> `toUiModel`, helpers such as `mask`, `format`): they DO keep verbs because
> they are **operations, not models**. The noun-based naming rule does NOT
> apply to them.

### 4. Transport terms reserved for data

The words `Request`, `Response`, `Payload`, `DTO` and their variants (`Dto`,
`Req`, `Res`, `Resp`, `Body`, `Json`, `Raw`, `Api…Model`) are **reserved for
the data layer** (API DTOs).

- **Domain layer — file names and implementation:** they must not appear in
  the file name (`beneficiary-request.domain-model.ts` ❌), in any declared
  type / interface / namespace / enum (including nested ones) nor in property
  names (`requestPayload: …` ❌). The domain names the business concept
  (`BeneficiaryCreationDomainModel`, `creation`, `beneficiary`), not the
  transport artifact.
- **UI layer — declared names:** they must not appear in UI model names either.

Extra terms the team wants to forbid go in `domain_forbidden_terms` of the
profile (comma-separated).

| Layer          | Correct                          | Incorrect                       |
| -------------- | -------------------------------- | ------------------------------- |
| domain         | `BeneficiaryCreationDomainModel` | `CreateBeneficiaryRequestModel` |
| data           | `BeneficiaryCreationDataModel`   | (Request/Response/DTO allowed)  |
| UI             | `BeneficiaryUiModel`             | `BeneficiaryResponseUiModel`    |

> This rule is the single owner of model **file suffixes**, **noun names** and
> **transport terms** for every layer; the layer rules (domain / data /
> presentation) only check content, imports and contracts.

**Detection:**

```bash
find src -name "*-ui.model.ts" -o -name "*.response.ts" -o -name "*.request.model.ts"
find src -path "*/model/*-model.ts" ! -name "*.ui-model.ts" ! -name "*.data-model.ts" ! -name "*.domain-model.ts"
find src/private/domain/model src/private/data/api/model -name "*.model.ts"
# Verbs in model file names and in any declaration inside model files
find src/private -name "*-model.ts" | grep -E "/(get|post|put|patch|fetch|create|delete|remove|update|edit|select|calculate|search|validate|send|save|set|add|load|submit|register|verify|check|confirm|cancel|generate|retrieve|process|find|make|do)-"
grep -rnE "(interface|namespace|type) (Get|Post|Put|Patch|Fetch|Create|Delete|Remove|Update|Edit|Select|Calculate|Search|Validate|Send|Save|Set|Add|Load|Submit|Register|Verify|Check|Confirm|Cancel|Generate|Retrieve|Process|Find|Make|Do)[A-Z]" src/private --include="*-model.ts"
# Transport terms in the domain: file names, declarations and properties
find src/private/domain -iname "*request*" -o -iname "*response*" -o -iname "*payload*" -o -iname "*dto*"
grep -rnE "(interface|type|namespace|enum|class) \w*(Request|Response|Payload|DTO|Dto|Req|Resp|Body|Json)\b|^\s+\w*(request|response|payload|dto|Request|Response|Payload|Dto|DTO)\w*\??:" src/private/domain
grep -rnE "(interface|type|namespace|class) \w*(Request|Response|Payload|DTO)\b" src/private/presentation
# Suffix declared in the wrong layer
grep -rnE "export (interface|type|namespace|class) \w+DomainModel\b" src/private/data src/private/presentation
grep -rnE "export (interface|type|namespace|class) \w+DataModel\b" src/private/domain src/private/presentation
grep -rnE "export (interface|type|namespace|class) \w+UiModel\b" src/private/domain src/private/data
```

**Correction:**

1. `git mv` the file to the correct suffix.
2. Rename the symbol to the noun form + correct suffix.
3. Update every import and reference in `src`.
4. `pnpm typecheck` + `pnpm lint --fix`.
