---
title: Destructure props and params in the signature — no rest operator
impact: MEDIUM
impactDescription: the signature documents exactly what a component or util uses; no hidden props forwarded by ...rest
tags: typescript, props, params, destructuring, rest, components, utils, hooks
---

## Destructure props and params in the signature — no rest operator

**Impact: MEDIUM**

Wherever an interface types an input object — component props, hook params,
utils params (`XUtilsParams.Fn`), mapper or handler params — the function
**destructures it in the signature**, lists every property it uses **in the same
alphabetical order as the interface** (`ts-alphabetical-properties`), and does
**not** use the rest operator (`...rest`, `...props`, `...others`).

Why: the signature becomes the documentation of what the function really
consumes; unused props surface immediately (`noUnusedParameters`); and `...rest`
silently forwards props nobody reviewed (styles, handlers, accessibility
values) to the child, which breaks memoization and hides contract changes.

**Incorrect:**

```tsx
// ❌ not destructured
export const BeneficiaryCard = (props: Readonly<BeneficiaryCardProps>) => (
  <Pressable onPress={props.onPress}>
    <CanvasText>{props.alias}</CanvasText>
  </Pressable>
);

// ❌ rest operator forwards unknown props
export const BeneficiaryCard = ({ alias, ...rest }: Readonly<BeneficiaryCardProps>) => (
  <Pressable {...rest}>
    <CanvasText>{alias}</CanvasText>
  </Pressable>
);

// ❌ destructured out of the interface order
export const mapConceptsToOptions = ({ selectedId, concepts }: SelectConceptUtilsParams.MapConceptsToOptions) => …
```

**Correct:**

```tsx
export const BeneficiaryCard = ({
  accountNumber,
  alias,
  bankName,
  isFavorite = false,
  onPress,
}: Readonly<BeneficiaryCardProps>) => (
  <Pressable accessibilityRole="button" onPress={onPress}>
    <CanvasText>{alias}</CanvasText>
    <CanvasText>{bankName}</CanvasText>
    <CanvasText>{accountNumber}</CanvasText>
    {isFavorite ? <FavoriteBadge /> : null}
  </Pressable>
);

export const mapConceptsToOptions = ({
  concepts,
  selectedId,
}: SelectConceptUtilsParams.MapConceptsToOptions): Option[] =>
  concepts.map((concept) => ({
    id: concept.code,
    isSelected: concept.code === selectedId,
    label: concept.description,
  }));
```

**Rules:**

1. Destructure in the parameter list, not in the body (`const { a } = props`).
2. Same order as the interface (alphabetical); defaults inline (`isFavorite = false`).
3. No `...rest` in parameters or when spreading props into a child
   (`{...props}` / `{...rest}`). Pass each prop explicitly. Spreading in
   immutable state updates (`{ ...prev, alias }`) is unrelated and allowed.
4. Destructure only what is used; if a prop is not used, remove it from the
   interface.

**Detection:** `node <skill>/scripts/scan.mjs --rule=ts-destructured-props`
(non-destructured `props` / `params`, `props.x` access, `...rest` in
parameters or JSX spreads, destructuring out of alphabetical order).

**Correction:**

1. Replace `(props: Props)` with `({ a, b, c }: Readonly<Props>)` in A→Z order.
2. Replace `{...rest}` with the explicit props the child needs; add them to
   the interface if they are part of the contract.
3. `pnpm typecheck` + `pnpm lint --fix`.
