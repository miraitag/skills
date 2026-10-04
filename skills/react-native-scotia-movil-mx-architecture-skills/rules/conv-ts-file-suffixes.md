---
title: TypeScript file suffixes by construct type
impact: MEDIUM
impactDescription: immediate clarity about a module's content without opening it; eases search and tree-shaking
tags: conventions, TypeScript, suffixes, interface, enum, types, naming
---

## TypeScript file suffixes by construct type

**Impact: MEDIUM**

Semantic suffixes on TypeScript files communicate the content without needing to
open the file. In addition, separating enums from types avoids importing runtime
code (enums) where only compile-time types are needed.

**Incorrect (everything in a generic file or inconsistent suffixes):**

```
// ❌ Everything mixed in a single file
models.ts
types.ts   ← mixes interfaces, enums, and types
utils/user.ts ← contains only the UserProfile interface
```

```tsx
// models.ts — ❌ no descriptive suffix
export interface UserProfile { ... }
export enum AccountStatus { Active, Blocked }
export type Nullable<T> = T | null;
```

**Correct (one suffix per category):**

```
user-profile.interface.ts   ✅ only interfaces
account-status.enum.ts      ✅ only enums (generate JS at runtime)
shared.types.ts             ✅ type aliases, unions, utility types
```

```tsx
// user-profile.interface.ts
export interface UserProfile {
  email: string;
  id: string;
  name: string;
}

// account-status.enum.ts  ✅ generates real JS at runtime
export enum AccountStatus {
  Active = 'ACTIVE',
  Blocked = 'BLOCKED',
  Pending = 'PENDING',
}

// shared.types.ts  ✅ only pure type constructs (generate no JS)
export type Nullable<T> = T | null;
export type Currency = 'MXN' | 'USD';
export type ApiResponse<T> = { data: T; status: number };
```

**Reference table:**

| Suffix          | Contains                             | Generates JS |
| --------------- | ------------------------------------ | ------------ |
| `.interface.ts` | `interface` declarations             | No           |
| `.enum.ts`      | `enum` declarations                  | **Yes**      |
| `.types.ts`     | `type`, unions, utility types        | No           |
| `.service.ts`   | business logic / API calls           | Yes          |
| `.hook.ts`      | custom hooks (alternative to `use-`) | Yes          |

**Scotia feature libraries and design-system libraries** use these suffixes
instead of the generic table above (the profile's `naming_variant` does not
change them):

| Suffix            | Contains                      | Example                      |
| ----------------- | ----------------------------- | ---------------------------- |
| `.props.ts`       | component props interface     | `canvas-button.props.ts`     |
| `.model.ts`       | domain types/namespaces       | `canvas-text-field.model.ts` |
| `.utils.ts`       | utility functions             | `canvas-button.utils.ts`     |
| `.params.ts`      | utils parameter types         | `canvas-button.params.ts`    |
| `use<Feature>.ts` | custom hooks (NOT `.hook.ts`) | `useCollapsible.ts`          |

`.interface.ts` and `.hook.ts` are not used. Layer model suffixes
(`.ui-model.ts`, `.data-model.ts`, `.domain-model.ts`) are owned by
`naming-conventions`; hook extensions by `hooks-conventions`.

Reference: [TypeScript Handbook — Enums](https://www.typescriptlang.org/docs/handbook/enums.html)
