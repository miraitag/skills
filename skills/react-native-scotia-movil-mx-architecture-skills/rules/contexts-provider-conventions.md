---
title: Contexts and Provider (dependency injection)
impact: HIGH
impactDescription: host dependencies are consumed via context, without prop drilling
tags: presentation, context, provider, dependency-injection, hooks
skill: contexts-provider-conventions
---

## Contexts and Provider

**Impact: HIGH**

Rules for `src/private/presentation/contexts/`.

### Structure

```
contexts/
├── international-money-transfer.context.tsx        # createContext
├── provider/
│   ├── international-money-transfer.provider.tsx        # Provider
│   └── international-money-transfer.provider.props.tsx  # provider props
└── hooks/
    └── use<Contract>.tsx                            # consumer hooks
```

### Rules

1. **kebab-case names** with a role suffix: `*.context.tsx`, `*.provider.tsx`,
   `*.provider.props.tsx`. Consumer hooks follow `hooks-conventions`
   (`use<Contract>.tsx` in `contexts/hooks/`).
2. **The provider is the composition root**: it builds the context value from
   the host contracts (props) and instantiates the gateway implementations
   (`new XGatewayImpl(...)`). Gateways are never instantiated in screens,
   view-models or components.
3. **Consumption only via accessor hooks in `contexts/hooks/`**. Never
   `useContext` directly in screens/components.

> **Not here (code-quality):** typing `createContext<T | undefined>`, the guard
> that throws outside the provider, and memoizing the value with `useMemo` are
> audited by `react-native-scotia-movil-mx-code-quality-skills` →
> `state-context-api`.
4. **No prop drilling**: dependencies (gateway, dispatchers, contracts) are
   obtained via hooks, not by passing props down the tree.
5. **The screen tree lives under the provider** (mounted from the public
   component, see `public-api-conventions`).

**Detection:**

```bash
# useContext used outside contexts/hooks (should be wrapped in a guarded hook)
grep -rn "useContext(" src/private/presentation/screens
# context/provider file names off convention
find src/private/presentation/contexts -name "*.tsx" | grep -vE "\.(context|provider|provider\.props)\.tsx$|/hooks/use"
```

**Correction:**

1. Wrap any direct `useContext` in a `use<Contract>` accessor in
   `contexts/hooks/`.
2. Rename files to the correct role suffix.
3. Move dependency construction (gateways, contracts) into the provider.
4. `pnpm typecheck` + `pnpm lint`.
