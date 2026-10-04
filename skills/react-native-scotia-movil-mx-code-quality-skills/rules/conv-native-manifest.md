---
title: Permissions in native manifests (iOS plist + Android manifest)
impact: HIGH
impactDescription: App Store / Play Store reject apps with generic or incorrect permissions for the target API version
tags: conventions, permissions, iOS, Android, Info.plist, AndroidManifest, security
---

## Permissions in native manifests

**Impact: HIGH**

Apple and Google reject apps in review if permissions lack a specific,
contextual usage description, or if they use permissions that are obsolete for
the target API version.

**Incorrect (generic descriptions + wrong permission for Android 13+):**

```xml
<!-- ios/Runner/Info.plist — ❌ generic description rejected by the App Store -->
<key>NSCameraUsageDescription</key>
<string>This app needs access.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Required by the app.</string>
```

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<!-- ❌ READ_EXTERNAL_STORAGE is deprecated on Android 13+ (API 33+) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

**Correct:**

```xml
<!-- ios/Runner/Info.plist — ✅ specific and contextual description -->
<key>NSCameraUsageDescription</key>
<string>Scotiabank needs camera access to scan your CoDi QR code.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Select a photo from your gallery to update your profile picture.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>We show the nearest Scotiabank ATMs and branches to your location.</string>
```

```xml
<!-- android/app/src/main/AndroidManifest.xml -->

<!-- ✅ Android <= 32: READ_EXTERNAL_STORAGE with maxSdkVersion="32" for legacy compatibility -->
<uses-permission
    android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />

<!-- ✅ Android 13+ (API 33+): READ_MEDIA_IMAGES replaces READ_EXTERNAL_STORAGE -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

<!-- ✅ uses-feature filters out incompatible devices on the Play Store -->
<uses-feature
    android:name="android.hardware.camera"
    android:required="false" />  <!-- false if the camera is not mandatory -->
```

**Table of common permissions in mobile banking:**

| Feature        | iOS (`Info.plist`)                    | Android (`<= API 32`)   | Android (`>= API 33`)  |
| -------------- | ------------------------------------- | ----------------------- | ---------------------- |
| Camera         | `NSCameraUsageDescription`            | `CAMERA`                | `CAMERA`               |
| Gallery (read) | `NSPhotoLibraryUsageDescription`      | `READ_EXTERNAL_STORAGE` | `READ_MEDIA_IMAGES`    |
| Location       | `NSLocationWhenInUseUsageDescription` | `ACCESS_FINE_LOCATION`  | `ACCESS_FINE_LOCATION` |
| Biometrics     | `NSFaceIDUsageDescription`            | `USE_BIOMETRIC`         | `USE_BIOMETRIC`        |

Reference: [Apple — Describing use of protected resources](https://developer.apple.com/documentation/uikit/protecting_the_user_s_privacy/requesting_access_to_protected_resources)

**In this repo:** being a **UI library**, it does not declare its own
permissions. The native configuration lives in the example app and in the
config plugins (`example/plugins/withScotiaAndroid.js`,
`example/plugins/withScotiaIos.js`). Apply this rule if you add functionality
that requires permissions in the host app, not in the library.
