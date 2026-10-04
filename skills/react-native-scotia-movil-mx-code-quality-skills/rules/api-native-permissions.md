---
title: Runtime Permissions — check → request → BLOCKED
impact: HIGH
impactDescription: correct flow that distinguishes DENIED (dialog) from BLOCKED (Settings)
tags: apis, permissions, react-native-permissions, runtime, iOS, android
---

## Runtime Permissions — check → request → BLOCKED

**Impact: HIGH**

Permissions have four states: `GRANTED`, `DENIED` (dialog possible),
`BLOCKED` (Settings only), and `UNAVAILABLE`. `check()` queries the state
without showing any dialog. `request()` should only be called on `DENIED`.

**Incorrect (request without check, no BLOCKED handling):**

```tsx
import { request, PERMISSIONS } from 'react-native-permissions';

async function openCamera() {
  // ❌ Hardcoded iOS — throws an error on Android
  // ❌ If already GRANTED, it shows the dialog anyway
  // ❌ If BLOCKED, it doesn't guide the user to Settings
  await request(PERMISSIONS.IOS.CAMERA);
  startCamera();
}
```

**Correct (check → request → BLOCKED with openSettings):**

```tsx
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from 'react-native-permissions';
import { Alert, Platform } from 'react-native';
import { strings } from '../values/strings';

async function ensureCameraPermission(): Promise<boolean> {
  // ✅ Select the correct constant based on the platform
  const permission =
    Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

  // ✅ check(): queries the current state WITHOUT showing any dialog
  const status = await check(permission);

  if (status === RESULTS.GRANTED) return true;

  if (status === RESULTS.DENIED) {
    // ✅ DENIED: shows the native system dialog
    const result = await request(permission);
    return result === RESULTS.GRANTED;
  }

  if (status === RESULTS.BLOCKED) {
    // ✅ BLOCKED: only Settings can unblock it
    Alert.alert(strings.permissions.cameraTitle, strings.permissions.cameraBlocked, [
      { onPress: openSettings, text: strings.permissions.openSettings },
    ]);
    return false;
  }

  return false; // UNAVAILABLE: hardware not present
}
```

Reference: [react-native-permissions](https://github.com/zoontek/react-native-permissions)

**In this repo:** the UI library does not request permissions. This rule applies
to the host app/feature that integrates hardware functionality; the native
config lives in `example/plugins/`.
