---
title: Yup — Validation Schemas with InferType
impact: MEDIUM
impactDescription: single source of truth for rules, error messages, and TypeScript types
tags: apis, forms, yup, InferType, abortEarly, validation
---

## Yup — Validation Schemas with InferType

**Impact: MEDIUM**

Yup replaces multiple validation `if`s with a declarative schema.
`yup.InferType<typeof schema>` generates the TypeScript type from the schema —
a single source of truth. `abortEarly: false` returns all errors at once.

> **Scope:** this rule owns the **Yup authoring** mechanics (module scope,
> `InferType`, `abortEarly`). The schema's file name/location and the typed
> `createYupSchema<FormFields>` convention are defined by the
> `react-native-scotia-movil-mx-architecture-skills` rule `schemas-conventions`;
> they are not repeated here.

**Incorrect (schema inside the component, default abortEarly):**

```tsx
const MyForm = () => {
  // ❌ Schema inside the component — recreated on every render
  const schema = yup.object({
    email: yup.string().email().required(),
  });

  const handleSubmit = async () => {
    try {
      await schema.validate(values); // ❌ abortEarly: true → only first error
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        setErrors([err.message]); // ❌ Only the first error
      }
    }
  };
};
```

**Correct (schema at module scope + InferType + abortEarly: false):**

```tsx
// ✅ Schema at module scope — defined only once
const registerSchema = yup.object({
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], strings.registration.passwordMismatch)
    .required(strings.registration.confirmationRequired),
  email: yup
    .string()
    .email(strings.registration.invalidEmail)
    .required(strings.registration.emailRequired),
  name: yup
    .string()
    .trim()
    .min(2, strings.registration.nameTooShort)
    .required(strings.registration.nameRequired),
  password: yup
    .string()
    .min(8, strings.registration.passwordTooShort)
    .required(strings.registration.passwordRequired),
});

// ✅ Type inferred from the schema — single source of truth
type RegisterValues = yup.InferType<typeof registerSchema>;

// ✅ Function that returns a field → message map with all errors
async function validateForm(values: unknown): Promise<Record<string, string>> {
  try {
    await registerSchema.validate(values, { abortEarly: false }); // ✅ All errors
    return {};
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      // ✅ err.inner = array of all ValidationErrors
      return err.inner.reduce<Record<string, string>>((acc, e) => {
        if (e.path) acc[e.path] = e.message;
        return acc;
      }, {});
    }
    return {};
  }
}
```

> **Runtime-built schemas:** the module-scope requirement below assumes the
> fields are known at build time. When the fields arrive at runtime (a gateway
> returns field descriptors), the schema must be produced by a factory instead —
> see the `api-dynamic-schema-builder` rule.

Reference: [Yup — GitHub](https://github.com/jquense/yup)

**In this repo:** this feature library **does** ship `yup` as a runtime
dependency and validates forms with it. The schema lives next to the screen
([create-new-password.schema.ts](src/private/presentation/screens/create-new-password/create-new-password.schema.ts))
and is wrapped with the typed helper
([create-yup.schema.ts](src/private/presentation/schemas/create-yup.schema.ts)):
`createYupSchema<PasswordRequirementModel.PasswordCreationFormFields>(...)`. Here
the **single source of truth** is split intentionally: the `<Feature>FormFields`
model owns the value shape and the schema owns the rules; `createYupSchema`
preserves the model type instead of inferring it. Use `yup.InferType` only for
standalone schemas with no `FormFields` model. (Messages from
`values/strings.ts` are audited by the architecture rule `schemas-conventions`.)
