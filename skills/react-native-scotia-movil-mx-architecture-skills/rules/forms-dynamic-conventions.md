---
title: Dynamic Forms (runtime-built React Hook Form + Yup)
impact: HIGH
impactDescription: typed, layer-respecting forms whose fields are only known at runtime
tags: presentation, forms, dynamic, react-hook-form, yup, resolver, controller
skill: forms-dynamic-conventions
---

## Dynamic Forms (runtime-built React Hook Form + Yup)

**Impact: HIGH**

This rule covers the **structure and layer boundaries** of a form whose fields
are **not known at build time** — they are described by data fetched from a
gateway (field id, label, min/max length, pattern) and rendered on the fly. It
is the dynamic counterpart of [forms-conventions.md](forms-conventions.md): the
four artifacts and the layer split still apply, but the schema, the value shape,
and the default values are **built at runtime** instead of being hand-written.

> **When does this rule apply?** When a screen renders a set of inputs that comes
> from data (an API/gateway returns a list of field descriptors) instead of a
> fixed, hand-authored list of controls. If the schema and `defaultValues` are
> produced by iterating over a runtime array, this rule owns the **structure**;
> the **API mechanics** (the schema factory, `useMemo`, `reset`) are audited by
> the `react-native-scotia-movil-mx-code-quality-skills` rule
> `api-dynamic-schema-builder`.

> **Static vs dynamic — do not confuse them:**
>
> - [forms-conventions.md](forms-conventions.md) +
>   [schemas-conventions.md](schemas-conventions.md) own the **static** case: the
>   fields are known, the schema is authored **at module scope**, and the
>   `<Feature>FormFields` type lists each field explicitly.
> - **This rule** owns the **dynamic** case: the fields arrive at runtime, the
>   schema is produced by a **factory function**, and `FormFields` is an open
>   map. Neither rule replaces the other — pick the one that matches the form.

### The dynamic form artifacts (structure, naming, ownership)

| Artifact               | File / symbol                                       | Owns                                                                                       |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Field descriptor (domain) | `<Feature>FieldDomainModel` in `domain/model/<feature>-field.domain-model.ts` | What the gateway returns for **one** runtime field |
| Field descriptor (UI)  | `<Feature>FieldUiModel` in `screens/<screen>/model/<feature>-field.ui-model.ts` | The view shape of one field (`id`, `label`, `maxLength`, `minLength`, `pattern`, `placeholder`, …) |
| UI mapper              | `<Feature>FieldMapper.toUiModel` in `screens/<screen>/mapper/<feature>-field.mapper.ts` | Domain descriptor → UI descriptor (see `presentation-ui-mapper-conventions`) |
| Form fields model      | `<Feature>Model.<Feature>FormFields` in `screens/<screen>/model/<feature>.model.ts` | The open value map (`Record<string, string \| undefined>`) shared by schema and `useForm` |
| Schema **factory**     | `<screen>.schema.ts` next to the screen             | A function `(fields) => createYupSchema<FormFields>(…)` — see `api-dynamic-schema-builder` |
| Screen (form UI)       | `<screen>.screen.tsx`                               | Derives `schema` + `defaultValues` from the fields, wires inputs — no side-effects         |
| View-model             | `use<Screen>ScreenViewModel` in `<screen>.view-model.ts` | Fetches the descriptors, maps them with `toUiModel`, owns submit side-effects |

> The descriptor is a **UI model**, so it follows `presentation-ui-model-conventions`
> (`*.ui-model.ts`, `XUiModel`) — never `…DomainModel` inside presentation and never
> inside a generic `.model.ts`. Only the `FormFields` value map lives in
> `<feature>.model.ts`, exactly like the static form.

### Rules (structure & layer boundaries only)

1. **The view-model owns the field descriptors.** The gateway call that returns
   the runtime fields lives in the view-model (with its loading/error state),
   never in the screen or the schema. The domain descriptors are mapped with
   `<Feature>FieldMapper.toUiModel` before being stored, so `uiState` only holds
   `<Feature>FieldUiModel[]` (core rule of
   `presentation-view-model-conventions`). The screen reads the fields from
   `uiState`.
2. **`FormFields` is an open map, not a fixed record.** Type it as
   `Record<string, string | undefined>` (or a stricter branded map) so it can
   hold any runtime field id. Do **not** use `any`. Both the schema factory and
   `useForm<FormFields>()` share this single type.
3. **One field descriptor model** (`<Feature>FieldUiModel`) is the source of
   truth for what a field is (`id`, `label`, `placeholder`, `minLength`,
   `maxLength`, `pattern`). The schema factory and the renderer both read it —
   they never invent field metadata.
4. **The schema is a factory next to the screen**, `<screen>.schema.ts`,
   returning a `createYupSchema<FormFields>`-wrapped object built from the
   fields. Authoring/`useMemo` mechanics belong to
   `api-dynamic-schema-builder`; messages still come from `values/strings.ts`.
5. **The screen only derives and wires.** It derives `schema` and
   `defaultValues` from the runtime fields and resets the form when they change;
   it does not fetch, validate by hand, or hold field values in `useState`.
6. **Rendering the runtime fields** (loop keyed by `field.id`, one
   `<Controller>` each, no inline `rules`) is a mechanic owned by the
   code-quality rules `api-dynamic-schema-builder` and `api-rhf-controller`.
7. **Submit is unchanged from the static case**: `handleSubmit(onSubmit)` with
   the side-effects (gateway, loading, error, navigation) in the view-model —
   see [forms-conventions.md](forms-conventions.md) and the code-quality
   `api-form-submit-viewmodel`.

**Correct — file layout and responsibility split:**

```text
screens/createBeneficiary/
├─ create-beneficiary.screen.tsx        # derives schema + defaultValues, wires inputs
├─ create-beneficiary.schema.ts         # schema FACTORY: (fields) => createYupSchema(...)
├─ create-beneficiary.view-model.ts     # gateway.getDynamicFields, loading, error, submit
├─ components/
│  └─ beneficiaryInfoForm/               # renders the fields in a loop
└─ model/
   ├─ beneficiary-field.ui-model.ts      # BeneficiaryFieldUiModel (one runtime field)
   └─ beneficiary-creation.model.ts      # BeneficiaryCreationModel.BeneficiaryCreationFormFields (open map)
└─ mapper/
   └─ beneficiary-field.mapper.ts        # BeneficiaryFieldMapper.toUiModel (domain → UI)
```

```ts
// model/beneficiary-field.ui-model.ts — the view shape of ONE runtime field
export interface BeneficiaryFieldUiModel {
  id: string;
  label: string;
  maxLength: number;
  minLength: number;
  pattern: string;
  placeholder: string;
}

// model/beneficiary-creation.model.ts — open value map shared by schema and useForm
export namespace BeneficiaryCreationModel {
  export type BeneficiaryCreationFormFields = Record<string, string | undefined>;
}
```

```ts
// create-beneficiary.view-model.ts — fetch descriptors, map to UI models
const result = await beneficiaryGateway.getDynamicFields({ countryCode, type });
if (result.isSuccess) {
  setUiState((prev) => ({
    ...prev,
    beneficiaryFields: result.value.map(BeneficiaryFieldMapper.toUiModel), // ✅ UI models only
  }));
}
```

```tsx
// create-beneficiary.screen.tsx — derive from runtime fields, then wire
const { uiState, getDynamicFields, submitBeneficiary } =
  useCreateBeneficiaryScreenViewModel();

const formFields = useMemo(
  () => [
    ...uiState.bankFields,
    ...uiState.beneficiaryFields,
    ...uiState.swiftFields,
  ],
  [uiState.bankFields, uiState.beneficiaryFields, uiState.swiftFields]
);

const schema = useMemo(() => createBeneficiarySchema(formFields), [formFields]);
const defaultValues = useMemo(
  () => Object.fromEntries(formFields.map((f) => [f.id, strings.common.empty])),
  [formFields]
);

const { control, handleSubmit, reset, formState } =
  useForm<BeneficiaryCreationModel.BeneficiaryCreationFormFields>({
    mode: 'onChange',
    resolver: yupResolver(schema),
    defaultValues,
  });

// re-seed the form when the runtime fields arrive/change (mechanics → api-dynamic-schema-builder)
useEffect(() => reset(defaultValues), [defaultValues, reset]);
```

**Incorrect (dynamic form with crossed layers):**

```tsx
// ❌ Gateway call for the field descriptors inside the screen instead of the view-model
const fields = await gateway.getDynamicFields(countryCode, type);

// ❌ Parallel field state in useState — values won't flow through handleSubmit
const [values, setValues] = useState<Record<string, string>>({});

// ❌ FormFields typed as any — loses type-safety across schema and useForm
const { control } = useForm<any>();
```

**Detection (structural):**

```bash
# Screens that build a form from runtime data (schema derived from a fields array)
grep -rln "createYupSchema\|yupResolver" src/private/presentation/screens \
  | xargs -l grep -l "\.map(" 2>/dev/null
# Parallel field state for runtime fields (useForm<any> is checked by forms-conventions,
# gateway calls in screens by presentation-screen-conventions)
grep -rn "useState<Record" src/private/presentation/screens
# Dynamic schema factory placed off the .schema.ts convention
grep -rln "createYupSchema" src/private/presentation/screens/*/* \
  | grep -vE "\.schema\.ts$"
```

**Correction:**

1. Keep the four artifacts, but make the schema a **factory** in
   `<screen>.schema.ts`; put the descriptor in
   `model/<feature>-field.ui-model.ts` (`<Feature>FieldUiModel`) and the open
   `FormFields` map in `model/<feature>.model.ts`. Rename any presentation type
   called `…DomainModel`.
2. Move the field-descriptor gateway call to the view-model, map the result with
   `<Feature>FieldMapper.toUiModel`, and expose the fields through `uiState`.
3. Keep the derivation of `schema` and `defaultValues` in the screen (not in
   the view-model or the schema module) and never hold field values in
   `useState`; the `useMemo` + `reset` mechanics are `api-dynamic-schema-builder`.
4. For the concrete RHF/Yup construction mechanics apply the code-quality rule
   `api-dynamic-schema-builder` (and `api-rhf-controller`,
   `api-rhf-yup-resolver`, `api-form-submit-viewmodel`).
5. Validate with `pnpm typecheck` (and `pnpm lint --fix` if applicable).
