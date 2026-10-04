---
title: Screen and component decomposition (size, subcomponents, utils, hooks)
impact: MEDIUM
impactDescription: keeps screens readable — each file has one responsibility and logic lives where the architecture expects it
tags: presentation, screens, components, refactor, decomposition, utils, hooks, readability
skill: screen-decomposition-conventions
---

## Screen and component decomposition

**Impact: MEDIUM**

A screen should read like an index: layout of named sections, data from the
view-model, handlers wired to children. When a file mixes several visual
sections, long conditional branches, pure calculations and its own state
machine, it is hard to read, review and test. This rule defines **when** a file
must be split and **where** each extracted piece goes; the *where* reuses the
existing rules, it does not redefine them.

The audit only **measures** (scanner metrics below). The actual split /
extraction is done with the **Refactor Reviewer** agent (`agents/refactor-reviewer.agent.md`
in the skills repository),
one file at a time and with approval.

### Metrics (thresholds configurable in `.scotia-audit/profile.md`)

| Metric | Default | Profile key |
| --- | --- | --- |
| Lines of code of a `.tsx` (without imports, comments, blank lines and `StyleSheet.create`) | 200 | `max_component_lines` |
| JSX elements in the file | 40 | `max_jsx_elements` |
| `useState` / `useReducer` in one component | 4 | `max_state_hooks` |
| Handlers (`handleX` / `onX` functions) in one component | 6 | `max_handlers` |
| `renderX()` functions inside a component | 0 | — |
| Pure functions of more than 8 lines inside a component body | 0 | — |

### When to split into subcomponents

Split when a metric is exceeded **and** at least one of these is true:

1. The JSX has **visually distinct sections** (header, summary, list, form,
   footer, empty / error state) → one subcomponent per section.
2. A **conditional branch** renders more than ~15 lines of JSX → the branch is
   a subcomponent (`<EmptyState />`, `<ErrorState />`).
3. A JSX block is **repeated** (same structure with different data) → one
   component rendered N times.
4. A `renderX()` function exists → it becomes a component (`renderHeader()` →
   `<BeneficiariesHeader />`). `renderItem` for lists stays as the list API
   requires.

Where it goes: `screen-components-conventions` — private to the screen in
`screens/<screen>/components/<comp>/`, shared in `screens/components/<comp>/`,
with `<comp>.tsx` + `<comp>.props.ts`. Subcomponents only render; they receive
UI models / props and callbacks.

### When to extract logic, and to what

| The code… | Goes to | Rule that defines name and location |
| --- | --- | --- |
| Calls a gateway, handles loading / error, navigates, orchestrates the screen | the screen's **view-model** (`use<Screen>ScreenViewModel`) | `presentation-view-model-conventions` |
| Uses state, effects, refs or context and is cohesive (selection, timer, form step, animation) | a **hook** `use<Feature>` in the `hooks/` of its scope | `hooks-conventions` |
| Is pure: same input → same output, no React, no side effects (format, map, filter, validate, calculate) | a **util** in `utils/<name>.utils.ts` + params namespace | `utils-conventions` |
| Converts a domain model for display | a **UI mapper** `toUiModel` | `presentation-ui-mapper-conventions` |
| Is a fixed text, color, regex or date format | `values/` | `values-conventions` |

**Do not extract** when the piece is a one-liner used once, when the extracted
function would need more than ~4 parameters only to reach the parent's state
(the split is in the wrong place), or when it only moves code without making the
parent easier to read.

**Example — screen before / after:**

```tsx
// ❌ 320 lines: header + filters + list + empty state + pure formatting + local state machine
export const TransfersScreen = () => {
  const [query, setQuery] = useState(strings.common.empty);
  const [selectedId, setSelectedId] = useState<string>();
  const formatAmount = (amount: number) => { /* 12 lines of pure formatting */ };
  const renderHeader = () => ( /* 40 lines */ );
  …
};
```

```tsx
// ✅ the screen reads as an index
export const TransfersScreen = () => {
  const { onSelectTransfer, transfers, uiState } = useTransfersScreenViewModel();
  const { onQueryChange, query, visibleTransfers } = useTransferFilter({ transfers }); // hooks/useTransferFilter.ts
  return (
    <View style={styles.container}>
      <TransfersHeader summary={uiState.summary} />                         {/* components/transfersHeader */}
      <TransferFilters onQueryChange={onQueryChange} query={query} />
      {visibleTransfers.length ? (
        <TransferList onSelect={onSelectTransfer} transfers={visibleTransfers} />
      ) : (
        <TransfersEmptyState />
      )}
    </View>
  );
};
// formatAmount → utils/transfers.utils.ts (pure) or the UI mapper if it formats a domain field
```

**Detection:** `node <skill>/scripts/scan.mjs --rule=screen-decomposition-conventions`
(one hit per file with the exceeded metrics, plus `renderX()` functions and long
pure functions inside components).

**Correction:** run the **Refactor Reviewer** agent on the reported
files. It proposes the split / extractions using the tables above, applies
them only with approval, keeps behavior identical and validates with
`pnpm typecheck`.
