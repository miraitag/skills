---
title: Controlled Forms — touched + onBlur Pattern
impact: HIGH
impactDescription: avoids showing errors before the user interacts with the field
tags: state, hooks, forms, touched, onBlur, validation
---

## Controlled Forms — touched + onBlur Pattern

**Impact: HIGH**

A form needs three states: `values`, `errors`, and `touched`. Showing errors
from the first render creates friction. The correct pattern triggers validation
on `onBlur` (when the field loses focus). The `validate` function should live in
module scope so it is not recreated on every render.

**Incorrect (errors visible from the first render):**

```tsx
const emailError = !email.includes('@') ? 'Invalid email' : null;
// ❌ The user sees the red error even without having typed anything
{
  emailError && <Text style={{ color: 'red' }}>{emailError}</Text>;
}
```

**Correct (three states + validation on onBlur):**

```tsx
interface FormValues {
  email: string;
  password: string;
}
interface FormErrors {
  email?: string;
  password?: string;
}

// ✅ Validation function in module scope — defined only once
function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!regex.email.test(values.email)) errors.email = strings.login.invalidEmail;
  if (values.password.length < 6) errors.password = strings.login.passwordTooShort;
  return errors;
}

const LoginForm = () => {
  const [values, setValues] = useState<FormValues>({
    email: strings.common.empty,
    password: strings.common.empty,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  // ✅ touched controls when to show each error individually
  const [touched, setTouched] = useState<Record<keyof FormValues, boolean>>({
    email: false,
    password: false,
  });

  const handleBlur = (field: keyof FormValues) => () => {
    // ✅ Triggers validation when the field loses focus
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate(values));
  };

  return (
    <View>
      <TextInput
        value={values.email}
        onChangeText={(text) => {
          const updated = { ...values, email: text };
          setValues(updated);
          if (touched.email) setErrors(validate(updated));
        }}
        onBlur={handleBlur('email')}
      />
      {/* ✅ Error only visible once the field has been touched (ternary: two branches) */}
      {touched.email && errors.email ? (
        <CanvasText style={styles.error}>{errors.email}</CanvasText>
      ) : null}
    </View>
  );
};
```

**In this repo:** forms use React Hook Form, so the manual `touched` `useState`
above is **not** hand-rolled — RHF exposes it as `formState.touchedFields`. In
[create-new-password.screen.tsx](src/private/presentation/screens/create-new-password/create-new-password.screen.tsx)
the error is only shown through `errorText={errors.<field>?.message}` on
`CanvasPasswordTextField`, and `touchedFields.confirmPassword` gates the
cross-field revalidation (`trigger('confirmPassword')`). Render messages via
the Canvas input props (`errorText`); the error *color* is audited by
`conv-design-tokens`. Reserve the manual three-state pattern
for screens that intentionally avoid RHF.

Reference: [TextInput — React Native Docs](https://reactnative.dev/docs/textinput)
