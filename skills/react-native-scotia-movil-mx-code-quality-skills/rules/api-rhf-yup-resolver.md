---
title: React Hook Form + Yup — yupResolver and Single Source of Truth
impact: HIGH
impactDescription: a single source of truth for rules, types, and error messages
tags: apis, forms, react-hook-form, yup, yupResolver, resolver
---

## React Hook Form + Yup — yupResolver and Single Source of Truth

**Impact: HIGH**

`yupResolver(schema)` delegates all validation to Yup. With the resolver active,
the individual `rules` on `Controller` are ignored — don't mix them.
`yup.InferType` generates the TypeScript type from the schema automatically.

**Incorrect (rules mixed with the resolver):**

```tsx
const { control } = useForm<FormValues>({
  resolver: yupResolver(schema),
});

// ❌ With the resolver active, these rules are silently IGNORED
<Controller
  control={control}
  name="email"
  rules={{ required: 'This message will never appear' }}
  render={...}
/>
```

**Correct (schema as the single source of validation):**

```tsx
// ✅ Schema at module scope — single source of truth for rules AND types
const registrationSchema = yup.object({
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], strings.registration.passwordMismatch) // ✅ Cross-field
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

// ✅ Type derived from the schema — no duplication
type RegistrationValues = yup.InferType<typeof registrationSchema>;

const {
  control,
  handleSubmit,
  formState: { errors, isValid },
} = useForm<RegistrationValues>({
  resolver: yupResolver(registrationSchema), // ✅ All validation in Yup
  defaultValues: {
    confirmPassword: strings.common.empty,
    email: strings.common.empty,
    name: strings.common.empty,
    password: strings.common.empty,
  },
  mode: 'onBlur',
});

// ✅ No rules in the Controllers — the resolver manages them
<Controller
  control={control}
  name="name"
  render={({ field: { onChange, onBlur, value } }) => (
    <TextInput value={value} onChangeText={onChange} onBlur={onBlur} />
  )}
/>;
{
  errors.name ? <Text style={styles.error}>{errors.name.message}</Text> : null;
}

{
  /* ✅ isValid automatically disabled by RHF */
}
<Pressable disabled={!isValid} onPress={handleSubmit(onSubmit)}>
  <Text>{strings.registration.signUp}</Text>
</Pressable>;
```

Reference: [resolver — React Hook Form](https://react-hook-form.com/docs/useform#resolver)

**In this repo:** `react-hook-form`, `yup`, and `@hookform/resolvers` **are**
runtime dependencies and this pattern is applied in
[create-new-password.screen.tsx](src/private/presentation/screens/create-new-password/create-new-password.screen.tsx):
`useForm<PasswordRequirementModel.PasswordCreationFormFields>({ mode: 'onChange', resolver: yupResolver(createNewPasswordSchema) })`.
The `<Controller>`s carry no `rules` — the Yup schema is the only validation
source. The submit button reacts to `isValid` combined with `uiState`
(`uiState.areValidRequirements && isValid`), and the submit handler
(`handleSubmit(createNewPassword)`) belongs to the view-model, which owns the
gateway call, loading, and error state. The schema is typed with the
`FormFields` model via `createYupSchema`, so `yup.InferType` is not needed here.
