---
title: Validation schemas (Yup)
impact: MEDIUM
impactDescription: declarative and typed form validation
tags: presentation, schemas, yup, validation, forms
skill: schemas-conventions
---

## Validation schemas

**Impact: MEDIUM**

Rules for validation schemas that back a form. A schema lives next to the screen
that uses it (`screens/<screen>/<screen>.schema.ts`) or in
`src/private/presentation/schemas/` when it is a cross-cutting helper.

> This rule covers the **schema's structure**: its file name, location, and how
> it is typed with the form's `FormFields` model. The wiring of the schema into
> the form (React Hook Form) is covered by
> [forms-conventions.md](forms-conventions.md).
>
> **Not repeated here:** the Yup **authoring** mechanics — declaring the schema
> at module scope, `yup.InferType`, and `abortEarly: false` — belong to the
> `react-native-scotia-movil-mx-code-quality-skills` rule `api-yup-schema`. This
> architecture rule only owns naming, location, and the typed `createYupSchema`
> convention.
>
> **Runtime-built schemas:** when the fields come from data and the schema must
> be produced by a factory at runtime, see
> [forms-dynamic-conventions.md](forms-dynamic-conventions.md) and the
> code-quality rule `api-dynamic-schema-builder`. This rule stays the source of
> truth for the **static**, module-scope schema.

Runtime dependencies (`yup`, `react-hook-form`, `@hookform/resolvers`) are
checked by [forms-conventions.md](forms-conventions.md).

### Rules

1. **File**: `<screen>.schema.ts` in kebab-case next to the screen that uses it,
   or `*.schema.ts` under `presentation/schemas/` when it is a shared helper
   (e.g. `create-yup.schema.ts`).
2. **Yup as the declarative validation library**; each schema is typed with the
   form's values model (`yup.ObjectSchema<FormFields>`).
3. **Typed `createYupSchema` helper**: wrap every schema with the generic helper
   in `presentation/schemas/create-yup.schema.ts` so the schema keeps the
   `FormFields` type instead of being typed loosely.
4. **Form fields model as the source of truth**: the generic type comes from a
   `<Feature>FormFields` type declared in the screen's model namespace
   (e.g. `PasswordRequirementModel.PasswordCreationFormFields`). Noun-based name,
   `camelCase` fields, one field per form control.
5. **Messages come from `values/strings.ts`**, never inline literals, so copy
   stays centralized and translatable.
6. **No UI logic or side-effects**: a schema only describes validation rules.
   Touched/errors orchestration and API calls live in the view-model, and the
   RHF wiring lives in the screen. Wiring it through `yupResolver` is audited by
   the code-quality rule `api-rhf-yup-resolver`.

**Correct — generic helper (`presentation/schemas/create-yup.schema.ts`):**

```ts
import * as yup from 'yup';

const createYupSchema = <T extends object>(
  schema: yup.ObjectSchema<T>
): yup.ObjectSchema<T> => schema;

export default createYupSchema;
```

**Correct — screen schema typed with the form fields model:**

```ts
// create-new-password.schema.ts
import * as yup from 'yup';
import { regex } from '../../../values/regex';
import { strings } from '../../../values/strings';
import createYupSchema from '../../schemas/create-yup.schema';
import type { PasswordRequirementModel } from './model/password-requirement.model';

const createNewPasswordSchema =
  createYupSchema<PasswordRequirementModel.PasswordCreationFormFields>(
    yup.object().shape({
      password: yup
        .string()
        .required(strings.createNewPassword.labelPasswordRequirementsError)
        .min(8, strings.createNewPassword.labelPasswordRequirementsError)
        .matches(
          regex.basicPasswordRegex,
          strings.createNewPassword.labelPasswordRequirementsError
        ),
      confirmPassword: yup
        .string()
        .oneOf(
          [yup.ref('password')],
          strings.createNewPassword.errorConfirmPasswordMismatch
        )
        .required(strings.createNewPassword.errorConfirmPasswordEmpty),
    })
  );

export default createNewPasswordSchema;
```

**Correct — form fields model (`model/<name>.model.ts`):**

```ts
export namespace PasswordRequirementModel {
  export type PasswordCreationFormFields = {
    confirmPassword: string;
    password: string;
  };
}
```

**Incorrect (untyped schema, inline messages, side-effects):**

```ts
// password.ts  ← wrong name, no .schema suffix
import * as yup from 'yup';

// ❌ not typed with FormFields, ❌ inline literal messages
export const schema = yup.object().shape({
  password: yup.string().required('La contraseña es obligatoria'),
});

// ❌ side-effect inside the schema module
navigation.navigate('Next');
```

**Detection:**

```bash
# Schemas off the name convention
find src/private/presentation -name "*chema*.ts" | grep -vE "\.schema\.ts$"
# Yup schemas not wrapped with the typed helper
grep -rn "yup.object" src/private/presentation | grep -v "createYupSchema"
# Inline literal messages instead of strings.*
grep -rEn "\.(required|min|max|matches|oneOf)\(\s*['\"]" src/private/presentation
# Schemas with side-effects
grep -rn "useState\|useEffect\|navigation" src/private/presentation/schemas
```

**Correction:**

1. Rename to `<screen>.schema.ts` and place it next to the screen (or in
   `schemas/` if shared).
2. Wrap it with `createYupSchema<FormFields>` and type it with the
   `<Feature>FormFields` model.
3. Move every validation message to `values/strings.ts`.
4. `pnpm typecheck`.
