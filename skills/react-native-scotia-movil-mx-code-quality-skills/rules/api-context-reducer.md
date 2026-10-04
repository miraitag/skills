---
title: Context API + useReducer for Complex State
impact: MEDIUM
impactDescription: centralizes state transitions; prevents inconsistencies from multiple useState
tags: apis, useReducer, context, reducer, discriminated-union, state
---

## Context API + useReducer for Complex State

**Impact: MEDIUM**

When state has multiple sub-states that update together, `useReducer`
centralizes all transitions in a pure, predictable reducer. Separate contexts
for state and dispatch prevent unnecessary re-renders.

**Incorrect (multiple uncoordinated useState):**

```tsx
// ❌ Three states that must update together — inconsistency guaranteed
const [items, setItems] = useState<any[]>([]);
const [total, setTotal] = useState(0);
const [count, setCount] = useState(0);

const addItem = (item: any) => {
  setItems((prev) => [...prev, item]);
  setTotal((prev) => prev + item.price); // What if setItems fails?
  setCount((prev) => prev + 1); // State out of sync
};
```

**Correct (useReducer + separate contexts):**

```tsx
interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}
interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'CLEAR' };

// ✅ Pure reducer: no side effects, easy to test
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM':
      return { items: [...state.items, action.payload] };
    case 'REMOVE_ITEM':
      return { items: state.items.filter((i) => i.id !== action.payload.id) };
    case 'CLEAR':
      return { items: [] };
  }
};

// ✅ Separate contexts: components that only dispatch don't re-render on token changes
const CartStateCtx = createContext<CartState | undefined>(undefined);
const CartDispatchCtx = createContext<React.Dispatch<CartAction> | undefined>(
  undefined
);

export const CartProvider = ({ children }: Props) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  return (
    <CartStateCtx.Provider value={state}>
      <CartDispatchCtx.Provider value={dispatch}>
        {children}
      </CartDispatchCtx.Provider>
    </CartStateCtx.Provider>
  );
};
```

Reference: [useReducer + Context — React Docs](https://react.dev/learn/scaling-up-with-reducer-and-context)

**In this repo:** component state is simple and handled with
`useState`/`useCallback` (e.g. [useCollapsible.tsx](src/scotia-lego-ui/src/components/collapsible/hooks/useCollapsible.tsx));
`useReducer` is not used. Theming uses a memoized Context
([CanvasThemeProvider.tsx](src/canvas-core/src/canvas-core/theme/CanvasThemeProvider.tsx)).
Apply `useReducer` in the host app when state has complex, coordinated
transitions.
