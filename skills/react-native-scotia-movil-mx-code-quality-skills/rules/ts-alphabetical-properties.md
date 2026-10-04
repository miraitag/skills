---
title: Interface and type properties in alphabetical order
impact: MEDIUM
impactDescription: predictable contracts, smaller diffs and fewer merge conflicts; props are found without scanning the whole type
tags: typescript, interface, type, props, params, ordering, alphabetical
---

## Interface and type properties in alphabetical order

**Impact: MEDIUM**

Every `interface` and object `type` declares its members in **alphabetical
order** (A→Z, case-insensitive): component props, utils params
(`XUtilsParams`), UI / domain / data models, `UiState`, context contracts,
provider props and nested object types (each nesting level is sorted on its
own). TypeScript does not care about the order, so sorting never changes
behavior — it only makes contracts predictable and keeps diffs small when two
people add a property at the same time.

Optional (`?`), `readonly`, and method members are sorted by name like any
other property. Index signatures (`[key: string]: T`) go last.

> The **destructuring** of those props / params follows the same order — see
> `ts-destructured-props`. File and symbol *names* are architecture rules.

**Incorrect:**

```ts
export interface BeneficiaryCardProps {
  onPress: () => void;
  alias: string;          // ❌ a < o
  bankName: string;
  isFavorite?: boolean;
  accountNumber: string;  // ❌ out of order
}
```

**Correct:**

```ts
export interface BeneficiaryCardProps {
  accountNumber: string;
  alias: string;
  bankName: string;
  isFavorite?: boolean;
  onPress: () => void;
}

export namespace SelectConceptUtilsParams {
  export interface MapConceptsToOptions {
    concepts: ConceptDomainModel[];
    selectedId?: string;
  }
}
```

**Data models:** the order of properties in a `XDataModel` does not affect the
JSON sent or received, so transport models are sorted too (the mapper keeps the
field-by-field correspondence).

**Detection:** `node <skill>/scripts/scan.mjs --rule=ts-alphabetical-properties`
reports the first out-of-order member of each interface / object type.

**Correction:**

1. Reorder the members A→Z (case-insensitive); keep JSDoc comments attached to
   their member.
2. Reorder the destructuring that consumes the type (`ts-destructured-props`).
3. `pnpm typecheck` + `pnpm lint --fix`.
