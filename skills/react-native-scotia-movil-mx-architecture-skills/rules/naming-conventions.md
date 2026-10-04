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

**Incorrect:**

```
GetAccounts        CreateBeneficiary     DeleteBeneficiary
SearchBanks        ValidateFields        SelectBeneficiaryCountry
```

**Correct:**

```
Accounts           BeneficiaryCreation   BeneficiaryDeletion
BankSearch         FieldValidation       BeneficiaryCountry
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

The words `Request`, `Response`, `Payload`, and `DTO` are **reserved for the
data layer** (API DTOs). They must NOT appear in domain or UI names:

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
grep -rhnE "^export (interface|namespace|type) (Get|Create|Delete|Edit|Select|Calculate|Search|Validate)\w*(Ui|Data|Domain)?Model" src/private
grep -rnE "^export (interface|type|namespace|class) \w*(Request|Response|Payload|DTO)\b" src/private/domain src/private/presentation
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
