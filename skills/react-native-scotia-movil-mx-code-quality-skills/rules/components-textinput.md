---
title: Controlled TextInput with TypeScript
impact: HIGH
impactDescription: controlled mode mandatory for validation and programmatic clearing
tags: components, textinput, forms, keyboardType, controlled
---

## Controlled TextInput with TypeScript

**Impact: HIGH**

`TextInput` should always be used in controlled mode (`value` + `onChangeText`).
Uncontrolled mode makes it impossible to clear the input programmatically or
validate in real time. `keyboardType` shows the appropriate keyboard.
`returnKeyType` controls the keyboard's action button on iOS.

**Incorrect (no state, no keyboardType, no secureTextEntry):**

```tsx
const LoginForm = () => (
  <View>
    {/* ❌ Without value/onChangeText: uncontrolled mode */}
    <TextInput placeholder="Email" />
    {/* ❌ Without secureTextEntry: password visible */}
    <TextInput placeholder="Password" />
  </View>
);
```

**Correct (use the base component `CanvasTextField` with `textFieldParams`):**

```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { CanvasTextField } from '@scotia-movil-mx/react-native-canvas-core';
import { strings } from '../../../values/strings';

const LoginForm = () => {
  const [email, setEmail] = useState(strings.common.empty);

  return (
    <View>
      <CanvasTextField
        labelParams={{ text: strings.login.emailLabel }}
        textFieldParams={{
          keyboardOptions: 'email-address',
          onChangeText: setEmail,
          placeholder: strings.login.emailPlaceholder,
          value: email,
        }}
      />
    </View>
  );
};
```

**Correct (raw themed TextInput, when no base component exists):**

```tsx
const ControlledField = ({ label }: Readonly<{ label: string }>) => {
  const { canvasTheme } = useCanvasCoreTheme();
  const [value, setValue] = useState(strings.common.empty);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextInput
      value={value}
      onChangeText={setValue}
      placeholder={label}
      placeholderTextColor={canvasTheme.colorSemantic.textPlaceholder}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[
        canvasTheme.typographyComponent.inputFieldTextStyle,
        {
          borderBottomWidth: isFocused ? 2 : 1,
          borderBottomColor: isFocused
            ? canvasTheme.colorSemantic.borderPrimary
            : canvasTheme.colorSemantic.borderDefault,
        },
      ]}
      autoCapitalize="none"
      returnKeyType="done"
    />
  );
};
```

**In this repo:** the base implementation is
[CanvasTextField.tsx](src/canvas-core/src/canvas-core/components/inputs/canvasTextField/CanvasTextField.tsx),
which groups the configuration in `CanvasTextFieldModel.TextFieldParams`
(`value`, `onChangeText`, `placeholder`, `keyboardOptions`, `maxLength`),
manages the focus state and takes all colors from
`canvasTheme.colorSemantic` (never hardcoded). Reuse `CanvasTextField`
instead of creating new inputs.

Reference: [TextInput — React Native Docs](https://reactnative.dev/docs/textinput)
