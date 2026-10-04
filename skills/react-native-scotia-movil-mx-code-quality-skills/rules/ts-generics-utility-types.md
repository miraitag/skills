---
title: Generics and Utility Types
impact: HIGH
impactDescription: eliminates interface duplication and guarantees exhaustiveness with Record
tags: typescript, generics, utility-types, Pick, Omit, Partial, Record
---

## Generics and Utility Types

**Impact: HIGH**

`Pick<T,K>`, `Omit<T,K>`, `Partial<T>` and `Record<K,V>` derive new types from a
base interface without duplicating definitions. Changing the base interface
automatically updates all derived types.

**Incorrect (interfaces duplicated manually):**

```tsx
interface User {
  email: string;
  id: number;
  name: string;
  role: string;
}

// ❌ Manual duplication — guaranteed desynchronization
interface UserListItem {
  id: number;
  name: string;
  role: string;
}
interface UserFormData {
  email: string;
  name: string;
  role: string;
}
interface UserPatch {
  email?: string;
  name?: string;
  role?: string;
}

// ❌ Generic index: accepts any string as a key
const roleLabels: { [key: string]: string } = { admin: 'Admin' };
console.log(roleLabels['superadmin']); // silent undefined
```

**Correct (types derived from a single source):**

```tsx
interface User {
  createdAt: string;
  email: string;
  id: number;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

// ✅ Pick: only the fields needed for the list
type UserListItem = Pick<User, 'id' | 'name' | 'role'>;

// ✅ Omit: excludes server-generated fields
type UserFormData = Omit<User, 'id' | 'createdAt'>;

// ✅ Partial: for partial updates
type UserPatch = Partial<Omit<User, 'id' | 'createdAt'>>;

// ✅ Record with a finite union: TypeScript requires exhaustiveness
type Role = User['role'];
const roleLabels: Record<Role, string> = {
  admin: strings.roles.admin,
  editor: strings.roles.editor,
  viewer: strings.roles.viewer,
  // If you add 'superadmin' to the union, TypeScript requires adding it here too
};

// ✅ Reusable generic
interface PaginatedResponse<T> {
  data: T[];
  page: number;
  total: number;
}
```

**In this repo:** domain/model types live in `xxx.model.ts` files
(sometimes grouped in a `namespace`, like `CanvasTextFieldModel` in
[canvas-text-field.model.ts](src/canvas-core/src/canvas-core/components/inputs/canvasTextField/model/canvas-text-field.model.ts)).
Derive types with `Pick` / `Omit` / `Partial` / `Record` instead of duplicating
interfaces.

Reference: [Utility Types — TypeScript](https://www.typescriptlang.org/docs/handbook/utility-types.html)
