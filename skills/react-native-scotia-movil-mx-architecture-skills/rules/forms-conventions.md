---
title: Forms (React Hook Form + Yup)
impact: HIGH
impactDescription: consistent, typed, and layer-respecting form implementation
tags: presentation, forms, react-hook-form, yup, resolver, controller
skill: forms-conventions
---

## Forms (React Hook Form + Yup)

**Impact: HIGH**

This rule covers the **structure and layer boundaries** of a form: which
artifacts exist, how they are named, where they live, and which responsibility
belongs to each layer. It does **not** re-teach the React Hook Form / Yup API.
Those implementation mechanics live in the
`react-native-scotia-movil-mx-code-quality-skills` package and are **not**
repeated here:

| Mechanic (the "how")                                               | Owning rule (code-quality)  |
| ------------------------------------------------------------------ | --------------------------- |
| Authoring the Yup schema (module scope, `InferType`, `abortEarly`) | `api-yup-schema`            |
| `Controller` for native inputs                                     | `api-rhf-controller`        |
| `yupResolver` as the single validation source                      | `api-rhf-yup-resolver`      |
| `handleSubmit` + `isValid` submit gating                           | `api-form-submit-viewmodel` |
| Dynamic field arrays (`useFieldArray`)                             | `api-usefieldarray`         |
| Touched / error visibility                                         | `state-form-touched`        |

> **Runtime-built forms:** when the fields are not known at build time (a
> gateway returns field descriptors), follow the dynamic counterpart
> [forms-dynamic-conventions.md](forms-dynamic-conventions.md) for the structure
> and the code-quality `api-dynamic-schema-builder` for the mechanics. This rule
> stays the source of truth for the **static** case.

> **When does this rule apply?** When a screen renders inputs the user fills and
> submits. If `react-hook-form`, `yup`, and `@hookform/resolvers` are present in
> `package.json`, the form's **structure** (artifacts, names, locations, and
> layer separation) must follow this rule; the **API usage** is audited by the
> code-quality rules above.

### Required dependencies

| Package               | Role                                                      |
| --------------------- | --------------------------------------------------------- |
| `react-hook-form`     | Form state, validation lifecycle, and submit handling     |
| `yup`                 | Declarative schema                                        |
| `@hookform/resolvers` | Bridges the Yup schema to React Hook Form (`yupResolver`) |

If a form exists but these are missing, add them to runtime `dependencies`:

```bash
pnpm add react-hook-form yup @hookform/resolvers
```

### The four form artifacts (structure, naming, ownership)

| Artifact          | File / symbol                                    | Owns                                                                        |
| ----------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| Form fields model | `<Feature>FormFields` in `model/<name>.model.ts` | The value shape (types) shared by schema and `useForm`                      |
| Schema            | `<screen>.schema.ts` next to the screen          | The validation rules (see [schemas-conventions.md](schemas-conventions.md)) |
| Screen (form UI)  | `<screen>.screen.tsx`                            | Rendering and wiring inputs — no side-effects                               |
| View-model        | `use<Screen>ScreenViewModel` in `<screen>.view-model.ts` | Side-effects: gateway, loading, error, navigation                    |

### Rules (structure & layer boundaries only)

1. **The form is composed of the four artifacts above**, each in its correct
   location with its correct name/suffix.
2. **One shared type source**: the `<Feature>FormFields` model types both the
   schema and `useForm<FormFields>()`. Never duplicate the shape or use `any`.
3. **Schema next to the screen**: authoring conventions live in
   [schemas-conventions.md](schemas-conventions.md); the Yup mechanics live in
   the code-quality `api-yup-schema` rule.
4. **Layer boundary is the core of this rule**:
   - the **schema** owns validation rules (no UI, no side-effects),
   - the **screen** only renders and wires inputs (no gateway calls, no manual
     `useState` for field values/validation),
   - the **view-model** owns every side-effect (gateway, loading, error,
     navigation) and exposes the submit handler,
   - the **model** owns the types.
5. **Dependencies present** as runtime `dependencies` in `package.json`.

**Correct — file layout and responsibility split:**

```text
screens/create-new-password/
├─ create-new-password.screen.tsx        # renders + wires inputs (no side-effects)
├─ create-new-password.schema.ts         # Yup validation rules
├─ create-new-password.view-model.ts     # gateway, loading, error, submit handler
└─ model/
   └─ password-requirement.model.ts      # PasswordCreationFormFields (shared type)
```

```tsx
// create-new-password.screen.tsx — screen only renders and wires
const { uiState, createNewPassword } = useCreateNewPasswordScreenViewModel();
const {
  control,
  handleSubmit,
  formState: { isValid },
} = useForm<PasswordRequirementModel.PasswordCreationFormFields>({
  resolver: yupResolver(createNewPasswordSchema),
  // ...RHF config → see code-quality api-rhf-yup-resolver / api-form-submit-viewmodel
});

// submit handler belongs to the view-model, not the screen
onPress={handleSubmit(createNewPassword)};
```

**Incorrect (responsibilities crossing layers):**

```tsx
// create-new-password.screen.tsx
// ❌ field state and validation living in the screen instead of RHF + schema
const [password, setPassword] = useState('');
if (password.length < 8) setError('Mínimo 8 caracteres');

// ❌ gateway call inside the screen instead of the view-model
await passwordResetGateway.resetPassword({ newPassword: password });
```

**Detection (structural):**

```bash
# Screens that use a form but miss any of the four artifacts
for dir in $(grep -rln "useForm" src/private/presentation/screens | xargs -n1 dirname | sort -u); do
  ls "$dir"/*.schema.ts "$dir"/*.view-model.ts "$dir"/model/*.model.ts 2>/dev/null || echo "Missing artifact in: $dir"
done
# useForm not typed with a FormFields model
grep -rn "useForm<any>\|useForm(" src/private/presentation
# (gateway calls inside screens are checked by presentation-screen-conventions)
# Manual field state where an RHF-bound form is expected
grep -rn "useState" src/private/presentation/screens/*/*.screen.tsx
# Confirm the form dependencies are runtime dependencies
grep -E "\"(react-hook-form|yup|@hookform/resolvers)\"" package.json
```

**Correction:**

1. Ensure the screen has the four artifacts in place with correct names:
   `model/<name>.model.ts` (`<Feature>FormFields`), `<screen>.schema.ts`,
   `<screen>.screen.tsx`, and `<screen>.view-model.ts`.
2. Type both the schema and `useForm<FormFields>()` with the same
   `<Feature>FormFields` model.
3. Move any field `useState`/inline validation out of the screen: rules go to
   the schema, side-effects (gateway/loading/error/navigation) go to the
   view-model, and the screen keeps only rendering and wiring.
4. Add `react-hook-form`, `yup`, and `@hookform/resolvers` to runtime
   `dependencies` if missing.
5. For the concrete RHF/Yup API usage, apply the code-quality rules
   (`api-rhf-controller`, `api-rhf-yup-resolver`, `api-form-submit-viewmodel`,
   `api-yup-schema`).
6. Validate with `pnpm typecheck` (and `pnpm lint --fix` if applicable).
