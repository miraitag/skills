---
title: __DEV__ guard for development logs
impact: HIGH
impactDescription: prevents PII exposure in production; code stripped by Hermes in the release bundle
tags: conventions, __DEV__, logging, Hermes, security, PII, production
---

## `__DEV__` guard for development logs

**Impact: HIGH**

The Hermes bundler dead-code eliminates `if (__DEV__)` blocks in release
builds, so logging code never reaches production. Without this guard,
`console.log` exposes user data (PII), tokens, and internal state in
production builds — a direct security risk.

**Incorrect (unguarded logs in production):**

```tsx
// ❌ console.log always active — exposes PII in production
const login = async (credentials: Credentials) => {
  console.log('login credentials:', credentials); // ❌ password in logs
  const user = await authService.login(credentials);
  console.log('user token:', user.token); // ❌ exposed token
  return user;
};
```

**Correct (`createLogger` factory with a `__DEV__` guard):**

```tsx
// utils/logger.ts — ✅
type LogTag = 'AUTH' | 'CART' | 'TRANSFER' | 'API';

export function createLogger(tag: LogTag) {
  return {
    log: (...args: unknown[]) => {
      if (__DEV__) {
        // ✅ dead-code eliminated by Hermes in release
        console.log(`[${tag}]`, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (__DEV__) {
        console.warn(`[${tag}]`, ...args);
      }
    },
    error: (...args: unknown[]) => {
      if (__DEV__) {
        console.error(`[${tag}]`, ...args);
      }
      // In production: send to Crashlytics / Sentry (without PII)
      // crashlytics().recordError(args[0] instanceof Error ? args[0] : new Error(String(args[0])));
    },
  };
}

// hooks/use-auth-store.ts — ✅
const log = createLogger('AUTH');

export function useAuthStore() {
  const login = useCallback(async (credentials: Credentials) => {
    log.log('Starting login for user:', credentials.username); // ✅ without password
    const user = await authService.login(credentials);
    log.log('Login successful, userId:', user.id); // ✅ without token
    return user;
  }, []);

  return { login };
}
```

**Rules:**

1. **Never** `console.log` outside a `__DEV__` guard
2. **Never** log passwords, tokens, PINs, or account numbers
3. The factory pattern avoids repeating `if (__DEV__)` on every call
4. Production errors must go to a service (Crashlytics, Sentry) without including PII

Reference: [React Native — `__DEV__`](https://reactnative.dev/docs/javascript-environment#global-variables)

**In this repo:** the library does not perform runtime logging (there is no
`console.log` in `src/`). If you need to debug, always wrap in `if (__DEV__)`
and never log sensitive data; remember that ESLint (sonar) is active in the
project.
