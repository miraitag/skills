---
title: Community Modules — Check Hardware Availability
impact: HIGH
impactDescription: prevents an unhandled exception on devices without the sensor
tags: apis, community-modules, hardware, biometrics, isSensorAvailable
---

## Community Modules — Check Hardware Availability

**Impact: HIGH**

For modules that depend on hardware (biometrics, camera, GPS), always verify
availability BEFORE invoking the main API. The module instance should be created
only once, outside of the functions.

**Incorrect (no check, instance per call):**

```tsx
import ReactNativeBiometrics from 'react-native-biometrics';

async function authenticateUser(): Promise<boolean> {
  // ❌ Instance created on every call
  const rnBiometrics = new ReactNativeBiometrics();

  // ❌ Without isSensorAvailable(): on devices without a sensor → unhandled exception
  const { success } = await rnBiometrics.simplePrompt({
    promptMessage: 'Confirm your identity',
  });
  return success;
}
```

**Correct (singleton + prior check):**

```tsx
import ReactNativeBiometrics from 'react-native-biometrics';

// ✅ Singleton instance created ONLY ONCE at module level
const rnBiometrics = new ReactNativeBiometrics();

async function authenticateUser(): Promise<boolean> {
  // ✅ isSensorAvailable(): checks hardware AND enrolled biometrics
  // Returns { available: boolean, biometryType: 'FaceID' | 'TouchID' | 'Biometrics' }
  const { available, biometryType } = await rnBiometrics.isSensorAvailable();

  // ✅ Early guard: clean return if the hardware is not available
  if (!available) return false;

  // ✅ simplePrompt is only called once we know the sensor exists
  const { success } = await rnBiometrics.simplePrompt({
    promptMessage: `Confirm with ${biometryType}`,
  });
  return success;
}
```

Reference: [React Native Directory](https://reactnative.directory/)

**In this repo:** the library does not integrate hardware modules. The current
native dependencies are UI/animation ones (`react-native-svg`,
`react-native-reanimated`, `react-native-gesture-handler`). Apply this
availability check in the host app when using sensors.
