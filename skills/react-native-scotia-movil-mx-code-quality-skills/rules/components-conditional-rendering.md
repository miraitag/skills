---
title: Safe Conditional Rendering
impact: CRITICAL
impactDescription: prevents production crash with 0 or empty string values
tags: components, conditional, jsx, crash, and-operator
---

## Safe Conditional Rendering

**Impact: CRITICAL — prevents production crash**

In React Native, if the left operand of `&&` is `0` or `""` (falsy but
renderable), React Native tries to render them as text outside of `<Text>`,
causing a production crash.

**Decision rule (repo convention):**

- Use a **ternary** (`cond ? A : B`) **only** when **both branches return
  something** (components or data) in each case.
- Use **`&&`** when you **only** need to render a component if the condition is
  met and there is **no else branch** (nothing is returned in the opposite
  case). In that case, ensure the left operand is a **boolean**
  (`Boolean(...)`, `!!`, or an explicit comparison), never a raw `number` or
  `string`.

**Incorrect (crash if count=0 or username=""):**

```tsx
const NotificationBar = ({ unreadCount, username }: Readonly<Props>) => (
  <View>
    {/* ❌ CRASH if unreadCount === 0 */}
    {unreadCount && <CanvasText>{unreadCount} messages</CanvasText>}

    {/* ❌ CRASH if username === "" */}
    {username && <CanvasText>Hello, {username}</CanvasText>}
  </View>
);
```

**Correct (`&&` when there is NO else branch — booleanize the operand):**

```tsx
const NotificationBar = ({ unreadCount, username }: Readonly<Props>) => {
  const hasUnread = unreadCount > 0;
  const hasUsername = Boolean(username.trim());
  return (
    <View>
      {hasUnread && (
        <CanvasText>
          {unreadCount} {strings.notifications.messages}
        </CanvasText>
      )}
      {hasUsername && (
        <CanvasText>
          {strings.notifications.greeting} {username}
        </CanvasText>
      )}
    </View>
  );
};
```

**Correct (ternary when there ARE two branches that return something):**

```tsx
{
  hasError && errorText ? (
    <SearchError text={errorText} />
  ) : (
    <SearchHint text={hintText} />
  );
}
```

**In this repo:** this pattern is already applied in
[Search.tsx](src/scotia-lego-ui/src/components/search/Search.tsx) and
[CanvasTextField.tsx](src/canvas-core/src/canvas-core/components/inputs/canvasTextField/CanvasTextField.tsx),
where a boolean is precomputed with `Boolean(...)` /
`?.trim()` before using `&&`, and `CanvasText` is used instead of `Text`.

Reference: [Conditional Rendering — React Native](https://reactnative.dev/docs/intro-react#conditional-rendering)
