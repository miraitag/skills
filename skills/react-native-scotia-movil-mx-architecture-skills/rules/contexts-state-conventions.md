---
title: Context state contracts and state ownership
impact: HIGH
impactDescription: context-backed global state keeps a clear contract, single ownership, and consistent naming
tags: presentation, context, state, provider, hooks, contract
skill: contexts-state-conventions
---

## Context state contracts and state ownership

**Impact: HIGH**

Rules for context-backed global state in `src/private/presentation/contexts/state/`.

### Structure

```
contexts/
├── mobile-top-up.context.tsx
├── provider/
│   ├── mobile-top-up.provider.tsx
│   └── mobile-top-up.provider.props.tsx
├── hooks/
│   └── useRechargeProviderState.ts
└── state/
    └── recharge/
        ├── recharge-provider.state.ts
      └── recharge-provider.state-impl.ts   # optional host-owned or internal implementation
```

### Rules

1. **kebab-case names** with explicit role suffixes: `*.state.ts` for the
   contract and `*.state-impl.ts` only for an implementation or adapter. State
   consumer hooks follow `use<Feature>ProviderState.ts` in `contexts/hooks/`.
2. **`*.state.ts` defines the state contract only**: the serializable shape,
   the actions, and the public provider-facing contract. Do not mix host
   dependencies, gateways, or navigation concerns into these files.
3. **State ownership is single and explicit**:
    - If the provider creates the state internally, `*.provider.props.tsx` must
       not declare that state as an input prop.
    - If the state is injected by a parent or host app, the provider must
       consume that prop and must not replace it with `new XProviderStateImpl()`.
    - Host-injected state is valid in feature libraries embedded into a native
       host app. The rule is not “provider-created only”; the rule is “one clear
       owner, no shadow instance inside the provider”.
4. **Context state hooks are accessors only**: they read the state contract
   from the context. They do not create or mutate state by themselves.

> **Not here:** `.ts` vs `.tsx` for hooks is owned by `hooks-conventions`. The
> guard that throws outside the provider (`state-context-api`) and whether the
> state is *reactive* (`state-context-reactivity`) are audited by
> `react-native-scotia-movil-mx-code-quality-skills`.

**Detection:**

```bash
# State contracts / implementations outside contexts/state
find src/private/presentation -type f \( -name "*.state.ts" -o -name "*.state-impl.ts" \)
# Double ownership = BOTH at once (each one alone is valid):
#   the provider props declare the state AND the provider instantiates it
grep -rlE "ProviderState" src/private/presentation/contexts/provider/*.provider.props.tsx
grep -rlE "new .*ProviderStateImpl\(" src/private/presentation/contexts/provider/*.provider.tsx
```

**Correction:**

1. Move the contract to `contexts/state/<feature>/` and keep only state-related
   types there.
2. Rename files and hooks to the `*.state.ts` / `*.state-impl.ts` /
   `use<Feature>ProviderState.ts` pattern.
3. Remove internal provider state from `*.provider.props.tsx` unless a parent
   or host app truly injects it.
4. If the state is injected, forward that exact instance. If it is internal,
   build it only inside the provider.
5. `pnpm typecheck` + `pnpm lint`.