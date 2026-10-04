---
title: React Hook Form — Controller for Native TextInput
impact: HIGH
impactDescription: register() doesn't work in React Native; Controller is the correct bridge
tags: apis, forms, react-hook-form, Controller, TextInput
---

## React Hook Form — Controller for Native TextInput

**Impact: HIGH**

In React Native, `register()` doesn't work because it was designed for the DOM.
`Controller` is the component that connects any native input to the RHF
lifecycle through the `render` prop.

**Incorrect (register on a React Native TextInput):**

```tsx
const { register, handleSubmit } = useForm<LoginValues>();

// ❌ register() is designed for HTML inputs — it doesn't work on TextInput
<TextInput
  {...register('email', { required: 'Email required' })}
  placeholder="Email"
/>;
// ❌ onChangeText ≠ the DOM's onChange; value may stay disconnected
```

**Correct (Controller with field.onChange → onChangeText):**

```tsx
const {
  control,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm<LoginValues>({
  defaultValues: { email: strings.common.empty, password: strings.common.empty },
  mode: 'onBlur', // ✅ Validates on blur — not on every keystroke
});

// ✅ Controller connects RHF with the native TextInput
<Controller
  control={control}
  name="email"
  rules={{
    // standalone RHF (no Yup resolver); with a resolver, drop `rules` (api-rhf-yup-resolver)
    pattern: { message: strings.login.invalidEmail, value: regex.email },
    required: strings.login.emailRequired,
  }}
  render={({ field: { onChange, onBlur, value } }) => (
    // ✅ field.onChange → onChangeText, field.onBlur → onBlur, field.value → value
    <TextInput
      style={[styles.input, errors.email ? styles.inputError : null]}
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      keyboardType="email-address"
      autoCapitalize="none"
    />
  )}
/>;
{
  errors.email ? (
    <Text style={styles.error}>{errors.email.message}</Text>
  ) : null;
}

{
  /* ✅ handleSubmit validates before calling onSubmit */
}
<Pressable onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
  <Text>{isSubmitting ? strings.login.submitting : strings.login.signIn}</Text>
</Pressable>;
```

Reference: [useForm — React Hook Form Docs](https://react-hook-form.com/docs/useform)

**In this repo:** React Hook Form **is** used. In
[create-new-password.screen.tsx](src/private/presentation/screens/create-new-password/create-new-password.screen.tsx)
each field is bound with a `<Controller>` whose `render` wires `field.onChange`
to the Canvas input's `onChangeText` and surfaces the message through
`errorText={errors.<field>?.message}` on `CanvasPasswordTextField` (not a raw
`TextInput`). Cross-field revalidation uses RHF APIs (`trigger('confirmPassword')`
plus `getValues`) inside `onChange`, while business logic (the gateway call)
stays in the view-model. Do not add per-`Controller` `rules`: validation comes
from the Yup `resolver`.
