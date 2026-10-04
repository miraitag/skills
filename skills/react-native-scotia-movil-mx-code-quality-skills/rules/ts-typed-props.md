---
title: Typed Props with Interface
impact: HIGH
impactDescription: catches type errors at compile time before running the app
tags: typescript, props, interface, typing
---

## Typed Props with Interface

**Impact: HIGH**

> **Scope:** typing only (interface, `Readonly<Props>`, no `any`). Member order
> → `ts-alphabetical-properties`; destructuring / `...rest` → `ts-destructured-props`. The props
> *file* (`<comp>.props.ts`) and its location are architecture
> (`screen-components-conventions`, `conv-ts-file-suffixes`).

Typing props with interfaces provides documentation of the component's contract,
compile-time error detection and autocompletion. `any` eliminates all these
benefits and produces bugs that are only discovered at runtime.

**Incorrect (any eliminates type checking):**

```tsx
// ❌ No typing: props implicitly any
const UserCard = (props: any) => (
  <View>
    <CanvasText>{props.name}</CanvasText>
    {/* props.role.toUpperCase() → crash if role is not passed */}
    <CanvasText>{props.role.toUpperCase()}</CanvasText>
  </View>
);

// ❌ No error even though age is a string
<UserCard name="Ana" age="thirty" />;
```

**Correct (explicit interface in `user-card.props.ts`):**

```tsx
// user-card.props.ts
export interface UserCardProps {
  age: number;
  name: string;
  role?: string;
}

// UserCard.tsx
const UserCard = ({ age, name, role = strings.userCard.noRole }: Readonly<UserCardProps>) => (
  <View style={styles.card}>
    <CanvasText style={styles.name}>{name}</CanvasText>
    <CanvasText style={styles.meta}>
      {strings.userCard.ageLabel} {age}
    </CanvasText>
    <CanvasText style={styles.meta}>{role.toUpperCase()}</CanvasText>
  </View>
);

// ✅ Compilation error: age must be number
// <UserCard name="Ana" age="thirty" />  → ❌ Type 'string' is not assignable to type 'number'
```

**In this repo:** each component defines its props with an `interface` and
destructures with `Readonly<Props>` — for example
[canvas-button.props.ts](src/canvas-core/src/canvas-core/components/buttons/canvasButton/canvas-button.props.ts)
and [avatar.props.ts](src/scotia-lego-ui/src/components/avatar/avatar.props.ts).
Never use `any`.

Reference: [TypeScript — React Native Docs](https://reactnative.dev/docs/typescript)
