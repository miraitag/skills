---
title: Dynamic Yup Schema — Runtime Factory + useMemo + reset
impact: MEDIUM
impactDescription: builds a typed, resolver-driven schema when the fields are only known at runtime
tags: apis, forms, react-hook-form, yup, dynamic, factory, useMemo, reset
---

## Dynamic Yup Schema — Runtime Factory + useMemo + reset

**Impact: MEDIUM**

`api-yup-schema` requires the schema **at module scope** because a static form's
fields are known ahead of time. When the fields come from data (a gateway
returns a list of field descriptors), that is impossible: the schema, the
`defaultValues`, and the value type must be **produced at runtime**. This rule
owns that mechanic — a pure **schema factory**, memoized derivation, and
`reset()` when the fields change — so a runtime-built form stays a single,
typed, resolver-driven source of truth.

> **Scope:** this rule is the runtime counterpart of `api-yup-schema`. It does
> **not** replace it — a static form still declares its schema at module scope.
> The form's **structure and layer split** (where the factory lives, who fetches
> the descriptors) is owned by the architecture rule
> `forms-dynamic-conventions`.

**Incorrect (schema/values rebuilt inline every render, parallel field state):**

```tsx
const CreateBeneficiaryScreen = () => {
  const { fields } = useCreateBeneficiaryScreenViewModel();

  // ❌ New schema object on every render → resolver identity changes, form thrashes
  const schema = yup.object(
    Object.fromEntries(fields.map((f) => [f.id, yup.string().required()]))
  );

  // ❌ Parallel field state outside RHF → values never reach handleSubmit
  const [values, setValues] = useState<Record<string, string>>({});

  const { control } = useForm<any>({ resolver: yupResolver(schema) }); // ❌ any + unstable schema
};
```

**Correct (pure factory + memoized schema/defaultValues + reset on change):**

```ts
// create-beneficiary.schema.ts — pure factory, no side-effects, messages from strings
import * as yup from 'yup';
import { strings } from '../../../values/strings';
import createYupSchema from '../../schemas/create-yup.schema';
import type { BeneficiaryFieldUiModel } from './model/beneficiary-field.ui-model';
import type { BeneficiaryCreationModel } from './model/beneficiary-creation.model';

const createFieldSchema = (
  field: BeneficiaryFieldUiModel
): yup.StringSchema => {
  let schema = yup.string().trim();

  if (field.minLength > 0) {
    schema = schema
      .required(strings.createBeneficiary.requiredDataError)
      .min(field.minLength, strings.createBeneficiary.requiredDataError);
  }

  if (field.pattern) {
    schema = schema.matches(
      new RegExp(field.pattern),
      strings.createBeneficiary.invalidFormatError
    );
  }

  return schema;
};

// ✅ Factory keeps FormFields typing via createYupSchema<FormFields>
export const createBeneficiarySchema = (
  fields: BeneficiaryFieldUiModel[]
) => {
  const shape = fields.reduce<Record<string, yup.StringSchema>>(
    (acc, field) => {
      acc[field.id] = createFieldSchema(field);
      return acc;
    },
    { alias: yup.string().trim() }
  );

  return createYupSchema<BeneficiaryCreationModel.BeneficiaryCreationFormFields>(
    yup.object().shape(shape)
  );
};
```

```tsx
// create-beneficiary.screen.tsx — memoize, then reset so RHF re-seeds
const schema = useMemo(() => createBeneficiarySchema(formFields), [formFields]);

// ✅ defaultValues derived from the same runtime fields — one empty entry per id
const defaultValues = useMemo(
  () =>
    Object.fromEntries(
      formFields.map((field) => [field.id, strings.common.empty])
    ),
  [formFields]
);

const {
  control,
  handleSubmit,
  reset,
  formState: { errors, isValid },
} = useForm<BeneficiaryCreationModel.BeneficiaryCreationFormFields>({
  mode: 'onChange',
  resolver: yupResolver(schema), // ✅ stable resolver: only changes when fields change
  defaultValues,
});

// ✅ Re-seed the form when the async fields arrive/change (defaultValues alone
//    only applies on mount, so reset is required)
useEffect(() => {
  reset(defaultValues);
}, [defaultValues, reset]);

// ✅ Render loop: one Controller per runtime field, keyed by field.id, no inline rules
{
  formFields.map((field) => (
    <Controller
      key={field.id}
      control={control}
      name={field.id}
      render={({ field: { onChange, onBlur, value } }) => (
        <CanvasTextField
          labelParams={{ text: field.label }}
          textFieldParams={{
            placeholder: field.placeholder,
            maxLength: field.maxLength,
            value: value ?? strings.common.empty,
            onChangeText: onChange,
            onBlur,
          }}
          inputErrorParams={
            errors[field.id]?.message
              ? { errorText: String(errors[field.id]?.message) }
              : undefined
          }
        />
      )}
    />
  ));
}
```

**Key mechanics:**

1. **Pure factory, no side-effects.** `createBeneficiarySchema(fields)` only
   maps descriptors to Yup rules and wraps them with `createYupSchema<FormFields>`.
2. **Memoize the schema and defaultValues** with `useMemo` keyed on the fields so
   the resolver identity is stable between renders and only changes when the
   fields do.
3. **`reset(defaultValues)`** when the fields change — `defaultValues` on
   `useForm` only applies at mount, so an async field set needs an explicit
   `reset`.
4. **`key={field.id}` and `name={field.id}`** on each `<Controller>`; validation
   comes from the resolver, never from inline `rules`.
5. Messages come from `values/strings.ts` — audited by the architecture rule
   `schemas-conventions`, not here.

Reference: [reset — React Hook Form](https://react-hook-form.com/docs/useform/reset)

**In this repo:** this is the pattern in
[create-beneficiary.schema.ts](src/private/presentation/screens/createBeneficiary/create-beneficiary.schema.ts)
and
[create-beneficiary.screen.tsx](src/private/presentation/screens/createBeneficiary/create-beneficiary.screen.tsx):
the view-model fetches the field descriptors (`getDynamicFields`), the screen
derives `schema` and `defaultValues` with `useMemo` and re-seeds via
`reset(defaultValues)`, and
[beneficiary-info-form.tsx](src/private/presentation/screens/createBeneficiary/components/beneficiaryInfoForm/beneficiary-info-form.tsx)
maps the fields to `<Controller>`s keyed by `field.id`. Use the static
`api-yup-schema` (module-scope schema) only when the fields are known at build
time. This dynamic case differs from `api-usefieldarray`: `useFieldArray` repeats
**one** fixed shape N times, whereas here each field has its own id, label, and
rules coming from data.
