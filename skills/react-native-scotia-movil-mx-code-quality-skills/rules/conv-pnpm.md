---
title: pnpm as the package manager with quarantine and exotic dep blocking
impact: HIGH
impactDescription: prevents supply chain attacks and newly published packages with malicious code
tags: conventions, pnpm, security, supply chain, dependencies, minimumReleaseAge
---

## pnpm as the package manager

**Impact: HIGH**

pnpm uses a content-addressable store with hard links, eliminating duplicates
across projects. The two critical security settings in `.npmrc` establish a
24-hour quarantine for new packages and block sub-dependencies published with
exotic distribution formats frequently used in supply chain attacks.

**Incorrect (npm or yarn without security configuration):**

```bash
# ❌ npm installs any freshly published version without quarantine
npm install react-native-camera

# ❌ yarn does too, and it creates duplicate node_modules (aggressive hoisting)
yarn add react-native-camera
```

```
# package.json — ❌ No .npmrc with security restrictions
{
  "dependencies": {
    "some-lib": "^1.0.0"
  }
}
```

**Correct (pnpm + security-focused .npmrc):**

```ini
# .npmrc ✅

# Quarantine: do not install versions published less than 24 hours ago.
# Blocks the "publish malicious patch → install immediately" vector.
minimumReleaseAge=1440

# Blocks sub-dependencies published with non-standard distribution formats
# (IPFS, git-hosted, etc.) used in supply chain attacks.
blockExoticSubdeps=true

# Also recommended:
# Prevents undeclared packages from being resolvable by app code.
node-linker=isolated
```

```bash
# ✅ Install with pnpm
pnpm add react-native-camera
pnpm install   # uses pnpm-lock.yaml (exact lockfile)

# ✅ Run a security audit
pnpm audit --audit-level=high
```

```json
// package.json — ✅ declares the required engine
{
  "engines": {
    "node": ">=18",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.0.0"
}
```

**Why `minimumReleaseAge=1440`:**
The most common attack vector is publishing a malicious version of a popular
package and hoping CI installs it within minutes. With 1440 minutes (24 h) of
quarantine, npm monitoring systems have time to detect and remove the package
before it reaches production.

Reference: [pnpm .npmrc — minimumReleaseAge](https://pnpm.io/npmrc#minimumreleaseage)

**In this repo:** **pnpm** is used (workspaces with `pnpm-workspace.yaml` and
`pnpm-lock.yaml`). The real values are `packageManager: pnpm@11`,
`engines.pnpm >= 11`, and the Node version from `.nvmrc` (`v22.20.0`) — adjust
the examples to these values, not to `pnpm@9`/`node>=18`. Commands:
`pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm example start`.
