---
title: Form Submit — handleSubmit + isValid, Side-effects in the View-Model
impact: HIGH
impactDescription: keeps forms validated before submit and free of side-effects in render
tags: apis, forms, react-hook-form, handleSubmit, isValid, view-model
---

## Form Submit — handleSubmit + isValid, Side-effects in the View-Model

**Impact: HIGH**

A form's submit path has two objectives: (1) never run the action with invalid
data, and (2) keep the async work (gateway call, navigation, loading, error) out
of the render body. Wrap the action with RHF's `handleSubmit` so it only fires
when the Yup schema passes, drive the button's disabled state from
`formState.isValid` (optionally combined with domain flags), and delegate the
actual work to the screen's view-model.

> **Scope:** this rule owns the **submit mechanic** (`handleSubmit` gating +
> `isValid` + no side-effects in render). _Where_ the view-model lives and how
> the form artifacts are named/placed is defined by the
> `react-native-scotia-movil-mx-architecture-skills` rule `forms-conventions`;
> it is not repeated here.

**Incorrect (manual validation + side-effects in the screen):**

```tsx
const onPress = async () => {
  // ❌ Re-validates by hand instead of relying on handleSubmit + resolver
  if (!password || password !== confirmPassword) {
    setError('Invalid');
    return;
  }
  // ❌ Gateway call, loading, and error live inside the screen
  setLoading(true);
  const res = await gateway.resetPassword({ newPassword: password });
  setLoading(false);
};

// ❌ Button always enabled — submits even when the form is invalid
<Pressable onPress={onPress}>
  <Text>Save</Text>
</Pressable>;
```

**Correct (handleSubmit gates submit; the view-model owns the effects):**

```tsx
const { uiState, createNewPassword, clearError } = useCreateNewPasswordScreenViewModel();

const {
  control,
  handleSubmit,
  formState: { errors, isValid },
} = useForm<PasswordRequirementModel.PasswordCreationFormFields>({
  mode: 'onChange',
  resolver: yupResolver(createNewPasswordSchema),
  defaultValues: {
    confirmPassword: strings.common.empty,
    password: strings.common.empty,
  },
});

// ✅ Domain rule (areValidRequirements) combined with RHF validity
const isEnableButton = uiState.areValidRequirements && isValid;

// ✅ handleSubmit validates with the schema, then calls the view-model action
<CanvasNavigationLoadingButton
  state={uiState.isLoading ? 'loading' : 'completed'}
  text={strings.common.callToActionSave}
  onPress={handleSubmit(createNewPassword)}
  disabled={!isEnableButton || uiState.isLoading}
/>;
```

```ts
// create-new-password.view-model.ts — side-effects isolated here
const createNewPassword = useCallback(
  async (formFields: PasswordRequirementModel.PasswordCreationFormFields) => {
    setUiState((prev) => ({ ...prev, isLoading: true, error: null }));
    const result = await passwordResetGateway.resetPassword({
      newPassword: formFields.password,
      // ...
    });
    setUiState((prev) =>
      result.isSuccess
        ? { ...prev, isLoading: false, isSuccess: result.value.success }
        : { ...prev, isLoading: false, error: result.error }
    );
  },
  [passwordResetGateway]
);
```

Reference: [handleSubmit — React Hook Form](https://react-hook-form.com/docs/useform/handlesubmit)

**In this repo:** this is the pattern in
[create-new-password.screen.tsx](src/private/presentation/screens/create-new-password/create-new-password.screen.tsx)
and its
[view-model](src/private/presentation/screens/create-new-password/create-new-password.view-model.ts).
The submit handler passed to `handleSubmit` is the view-model's
`createNewPassword`, the button is gated by `uiState.areValidRequirements && isValid`
and disabled while `uiState.isLoading`, and the gateway/loading/error live in the
view-model — never in the screen's render.
