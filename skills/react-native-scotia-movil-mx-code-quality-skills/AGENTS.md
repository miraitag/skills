# react-native-scotia-movil-mx-code-quality-skills — AGENTS.md

> Compiled document. Version 2.0.0  
> Organization: Scotiabank México — Mobile Team  
> 54 rules · 10 categories · React / React Native code quality

---

## Table of Contents

1. [Components](#1-components)
2. [TypeScript](#2-typescript)
3. [State and Hooks](#3-state-and-hooks)
4. [Styles](#4-styles)
5. [Lists](#5-lists)
6. [Performance](#6-performance)
7. [APIs and Data](#7-apis-and-data)
8. [Navigation](#8-navigation)
9. [Animations](#9-animations)
10. [Conventions](#10-conventions)

---

## 1. Components

### 1.1 Functional components with Pressable (CRITICAL)

Use arrow functions and `Pressable` instead of classes and `TouchableOpacity`.
`Pressable` allows custom feedback on `pressed`/`hovered` states and does not
have the 300 ms delay of `TouchableOpacity` on Android.

**Incorrect:**

```tsx
class MyButton extends React.Component {
  render() {
    return (
      <TouchableOpacity onPress={this.props.onPress}>
        <Text>OK</Text>
      </TouchableOpacity>
    );
  }
}
```

**Correct:**

```tsx
const MyButton = ({ label, onPress }: Props) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    accessibilityRole="button"
  >
    <Text>{label}</Text>
  </Pressable>
);
```

---

### 1.2 Safe conditional rendering (CRITICAL)

Using `&&` with non-boolean falsy values (`0`, `""`) renders the value on
screen. Always use a ternary or explicitly convert to a boolean.

**Incorrect:**

```tsx
{
  count && <Badge count={count} />;
} // ❌ renders "0"
{
  name && <Label text={name} />;
} // ❌ renders ""
```

**Correct:**

```tsx
{
  count > 0 ? <Badge count={count} /> : null;
}
{
  !!name && <Label text={name} />;
}
```

---

### 1.3 Composition through children (HIGH)

Accept `children: ReactNode` instead of specific props for arbitrary content.
It allows reusing containers without coupling them to their content.

```tsx
interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}
const Card = ({ children, style }: CardProps) => (
  <View style={[styles.card, style]}>{children}</View>
);
```

---

### 1.4 Image component with explicit dimensions (HIGH)

Without explicit dimensions or `flex`, `Image` collapses to 0x0. Use
`useMemo` for dynamic styles based on props.

```tsx
const Avatar = ({ size = 40, uri }: AvatarProps) => {
  const imgStyle = useMemo(
    () => ({ width: size, height: size, borderRadius: size / 2 }),
    [size]
  );
  return (
    <Image accessibilityLabel={strings.avatar.accessibilityLabel} source={{ uri }} style={imgStyle} />
  );
};
```

---

### 1.5 Controlled TextInput (HIGH)

Always use `value` + `onChangeText` for controlled inputs.
Configure `keyboardType`, `secureTextEntry`, `autoCapitalize`, and `returnKeyType`.

```tsx
<TextInput
  value={password}
  onChangeText={setPassword}
  secureTextEntry
  keyboardType="default"
  autoCapitalize="none"
  returnKeyType="done"
  onSubmitEditing={handleSubmit}
/>
```

---

### 1.6 Modal with onRequestClose and SafeAreaView (HIGH)

`onRequestClose` is required on Android (Back button). Wrap the content in
`SafeAreaView` to prevent it from sitting under the notch.

```tsx
<Modal
  visible={visible}
  onRequestClose={onClose}
  animationType="slide"
  transparent
>
  <SafeAreaView style={styles.container}>
    <View style={styles.sheet}>{children}</View>
  </SafeAreaView>
</Modal>
```

---

## 2. TypeScript

### 2.1 Typed props with Interface (HIGH)

Never use `any` for props. Define an explicit `interface` for each component.

```tsx
interface TransferCardProps { amount: number; currency: 'MXN' | 'USD'; onPress: () => void }
const TransferCard = ({ amount, currency, onPress }: TransferCardProps) => { ... };
```

---

### 2.2 Avoid React.FC (MEDIUM)

`React.FC` implicitly adds `children` (TS < 18) and hides the return type.
Prefer direct annotation of the props parameter.

```tsx
// ❌ React.FC<Props>
// ✅ function MyComp({ label }: Props): JSX.Element
```

---

### 2.3 Generic Utility Types (HIGH)

Use `Pick`, `Omit`, `Partial`, `Record` to derive types instead of
copying and pasting interfaces.

```tsx
type CreateUserPayload = Omit<User, 'id' | 'createdAt'>;
type UserFormValues = Partial<Pick<User, 'name' | 'email'>>;
```

---

### 2.4 Interface members in alphabetical order (MEDIUM)

Every `interface` / object `type` (props, utils params, models, `UiState`,
contracts) lists its members A→Z, case-insensitive; each nesting level is sorted
on its own and index signatures go last.

---

### 2.5 Destructured props and params, no rest operator (MEDIUM)

Components, hooks and utils destructure their props / params in the signature,
in the interface's alphabetical order, with no `...rest` and no `{...props}`
spread into children.

```tsx
export const BeneficiaryCard = ({ alias, bankName, onPress }: Readonly<BeneficiaryCardProps>) => …
```

---

## 3. State and Hooks

### 3.1 useState with generic type (HIGH)

Always specify the generic type in `useState`. Use the functional setter
when the new state depends on the previous one.

```tsx
const [items, setItems] = useState<CartItem[]>([]);
setItems((prev) => [...prev, newItem]);
```

---

### 3.2 useEffect with cleanup and deps (HIGH)

Every `useEffect` that subscribes or starts asynchronous operations must return
a cleanup. Use `AbortController` for async requests to cancel in-flight sockets.

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetchData({ signal: controller.signal })
    .then((data) => setData(data))
    .catch((err) => {
      if (err.name !== 'AbortError') setError(err);
    });
  return () => {
    controller.abort();
  };
}, [id]);
```

---

### 3.3 useCallback + useMemo in memoized components (HIGH)

`React.memo` only avoids re-renders if props do not change. Inline functions
are always new references — wrap them with `useCallback`.

```tsx
const handlePress = useCallback(
  () => onItemPress(item.id),
  [item.id, onItemPress]
);
const displayName = useMemo(() => `${item.firstName} ${item.lastName}`, [item]);
```

---

### 3.4 Typed useRef (MEDIUM)

For DOM node refs use `useRef<TextInput>(null)`. For non-UI values that
must not cause a re-render use `useRef<number>(0)`.

```tsx
const inputRef = useRef<TextInput>(null);
inputRef.current?.focus();
```

---

### 3.5 Context API with generic type and custom hook (HIGH)

Create the context with `createContext<T | undefined>(undefined)` and
encapsulate it in a custom hook that validates that the context exists.

```tsx
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

---

### 3.6 Reactive Context state in the Provider (HIGH)

If Context API replaces Redux or Zustand, the Provider must still own the
source of truth with `useState` or `useReducer`. A mutable class or plain
object stored inside a memoized context value does not trigger re-renders.
Expose a state snapshot plus actions instead of imperative `getState()` accessors.

```tsx
const [rechargeState, setRechargeStateValue] = useState(INITIAL_RECHARGE_STATE);

const setRechargeState = useCallback((patch: Partial<RechargeState>) => {
  setRechargeStateValue((current) => ({ ...current, ...patch }));
}, []);
```

---

### 3.7 Generic custom hook (MEDIUM)

Extract shared data logic into reusable generic hooks.

```tsx
function useApi<T>(url: string) {
  const [state, setState] = useState<FetchState<T>>({ status: 'idle' });
  useEffect(() => {
    /* fetch logic */
  }, [url]);
  return state;
}
```

---

### 3.8 Derived state computed during render (HIGH)

Compute derived values directly during render instead of synchronizing them
with `useEffect` + `useState`.

```tsx
// ❌ useEffect to synchronize derived state
// ✅ Compute during render
const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
const isCartEmpty = items.length === 0;
```

---

### 3.9 Form state with touched (HIGH)

Use a three-state pattern for forms: `values`, `errors`, `touched`.
Show errors only if the field was touched.

```tsx
const [touched, setTouched] = useState<
  Partial<Record<keyof FormValues, boolean>>
>({});
const showError = (field: keyof FormValues) =>
  touched[field] && !!errors[field];
```

---

### 3.10 Complete dependencies in hooks (HIGH)

`useEffect`, `useFocusEffect`, and `useCallback` must declare all the
variables they use. Omitting a dependency causes stale closures,
inconsistent re-executions, or behavior that only fails in certain navigation
flows.

```tsx
useEffect(() => {
  getAccounts();
}, [getAccounts]);

useFocusEffect(
  useCallback(() => {
    switch (lmtSelection.productType) {
      case OpportunityProductType.TDC:
        behavioralInsightsContract.changeContext('LMT_PAYMENT_TDC');
        break;
      default:
        break;
    }
  }, [behavioralInsightsContract, lmtSelection.productType])
);
```

**Practical rule:** include all external variables used inside the hook.
Do not disable `react-hooks/exhaustive-deps` unless there is a very specific
justification.

---

### 3.11 Rules of Hooks (HIGH)

Call hooks only at the top level of components and custom hooks — never inside
conditions, loops, nested callbacks, or after an early `return`. Move the
condition into the hook (argument / `enabled` flag). Keep
`react-hooks/rules-of-hooks` as `error`. The hook *name* (`use<Feature>`) is
audited by the architecture package (`hooks-conventions`).

---

### 3.12 Focus effects (HIGH)

`useFocusEffect(useCallback(() => { …; return cleanup; }, [deps]))` for work on
focus; `useIsFocused` only when the JSX depends on focus. Everything started
on focus is stopped in the cleanup.

---

## 4. Styles

### 4.1 StyleSheet.create (HIGH)

Always use `StyleSheet.create` for static styles. For dynamic styles
(based on props) use `useMemo`.

```tsx
const styles = StyleSheet.create({ card: { padding: 16, borderRadius: 8 } });
const dynamicStyle = useMemo(
  () => ({ color: active ? 'red' : 'gray' }),
  [active]
);
```

---

### 4.2 Responsive design with Flexbox and useWindowDimensions (MEDIUM)

Avoid fixed dimensions. Use `flex: 1` and `useWindowDimensions` to adapt
layouts to different screen sizes.

```tsx
const { width } = useWindowDimensions();
<View style={{ width: width * 0.9, flex: 1 }}>
```

---

### 4.3 Platform.select for platform-specific styles (MEDIUM)

Use `Platform.select` inside `StyleSheet.create` for differences between
iOS and Android.

```tsx
const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: { shadowColor: colors.common.shadow, shadowOpacity: 0.1, shadowRadius: 4 },
    android: { elevation: 4 },
  }),
});
```

---

### 4.4 gap instead of margin for spacing between children (MEDIUM)

`gap` on the parent container is cleaner than `marginBottom` on each child.
It avoids the last-element extra-margin problem.

```tsx
<View style={{ gap: 12 }}>
  {items.map((i) => (
    <ItemCard key={i.id} item={i} />
  ))}
</View>
```

---

### 4.5 Type safety with satisfies for styles (MEDIUM)

Use `satisfies ViewStyle`, `satisfies TextStyle`, `satisfies ImageStyle` instead of
unsafe type assertions (`as`) to validate style objects strictly without widening types.

```tsx
const style = { borderRadius: 8 } satisfies ViewStyle;
```

---

### 4.6 A single style without an array (LOW)

`style={styles.container}`, not `style={[styles.container]}`; the array form is
only for composing two or more styles.

---

## 5. Lists

### 5.1 Optimized FlatList (CRITICAL)

Use `FlatList` with `keyExtractor`, `renderItem` with `useCallback`,
`getItemLayout`, and `removeClippedSubviews` for large lists.

```tsx
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={renderItem} // useCallback in the parent component
  getItemLayout={(_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews
  windowSize={10}
/>
```

---

### 5.2 SectionList with typed sections (HIGH)

Use `SectionList` with the type `{ title: string; data: T[] }[]` and
`stickySectionHeadersEnabled` for grouped lists.

```tsx
<SectionList
  sections={sections}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <TransactionItem item={item} />}
  renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
  stickySectionHeadersEnabled
/>
```

---

### 5.3 Stable keys in lists and map (HIGH)

Keys must stably identify the element across renders. Using indexes breaks
reconciliation when the order changes, rows are inserted, or elements are
filtered: React remounts cells, loses local state, and may animate the wrong
elements.

```tsx
{
  items.map((item) => (
    <View key={item.id} style={styles.row}>
      <Text>{item.label}</Text>
    </View>
  ));
}

<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
/>;
```

**Practical rule:** if there is an immutable `id` or a business key, use it.
Do not use `index`.

---

## 6. Performance

### 6.1 React.memo with custom comparator (HIGH)

Wrap list components in `React.memo`. Provide a comparator when the props
are objects that change reference.

```tsx
const TransactionItem = React.memo(
  ({ item }: Props) => <View>...</View>,
  (prev, next) =>
    prev.item.id === next.item.id && prev.item.status === next.item.status
);
```

---

### 6.2 Do not define inline components (CRITICAL)

Defining components inside another component's render recreates them on every
render, breaking React's memoization.

```tsx
// ❌ const renderItem = ({ item }) => <ItemCard item={item} />;  // inline
// ✅ Define outside the component or use useCallback
const renderItem = useCallback(
  ({ item }: { item: Item }) => <ItemCard item={item} />,
  []
);
```

---

### 6.3 Hoist static JSX and FlatList props (HIGH)

Move static FlatList props to module-level constants to avoid creating new
references on every render.

```tsx
const EMPTY_COMPONENT = <EmptyState />;
const SEPARATOR = <Separator />;
<FlatList
  ListEmptyComponent={EMPTY_COMPONENT}
  ItemSeparatorComponent={() => SEPARATOR}
/>;
```

---

## 7. APIs and Data

### 7.1 Typed fetch with discriminated union (HIGH)

Model the state of a request as `FetchState<T>` with a discriminated union
to handle loading/success/error exhaustively.

```tsx
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
```

---

### 7.2 Parallel fetch with Promise.all (HIGH)

For independent requests use `Promise.all` instead of sequential `await`.

```tsx
const [user, accounts] = await Promise.all([
  api.getUser(userId),
  api.getAccounts(userId),
]);
```

---

### 7.3 Context + useReducer for global state (MEDIUM)

Use `useReducer` for complex state logic and separate the state context
from the dispatch context.

```tsx
const CartStateContext = createContext<CartState | undefined>(undefined);
const CartDispatchContext = createContext<Dispatch<CartAction> | undefined>(
  undefined
);
```

---

### 7.4 Native permissions with check→request→BLOCKED flow (HIGH)

Always check the permission status before requesting it. Show different UI
if the permission is BLOCKED (requires going to Settings).

```tsx
const status = await check(PERMISSIONS.IOS.CAMERA);
if (status === RESULTS.DENIED) await request(PERMISSIONS.IOS.CAMERA);
if (status === RESULTS.BLOCKED) openSettings();
```

---

### 7.5 Community modules with singleton and guard (HIGH)

Create a singleton instance of the module and check availability before
each operation.

```tsx
const biometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });
const { available } = await biometrics.isSensorAvailable();
if (!available) return;
```

---

### 7.6 Module-level Yup schema (MEDIUM)

Define the Yup schema outside the component to avoid recreating it on every
render. Use `InferType` to derive the type from the schema.

```tsx
const schema = yup.object({ email: yup.string().email().required() });
type FormValues = yup.InferType<typeof schema>;
```

---

### 7.7 React Hook Form with Controller (HIGH)

Use RHF's `Controller` for controlled fields instead of manual `register` +
`setValue`.

```tsx
<Controller
  name="email"
  control={control}
  render={({ field: { onChange, value } }) => (
    <TextInput value={value} onChangeText={onChange} />
  )}
/>
```

---

### 7.8 yupResolver with RHF (HIGH)

Combine `yupResolver` with RHF for declarative validation. Set
`abortEarly: false` to get all errors simultaneously.

```tsx
const { control, handleSubmit } = useForm<FormValues>({
  resolver: yupResolver(schema, { abortEarly: false }),
});
```

---

### 7.9 useFieldArray with key={field.id} (MEDIUM)

Use `useFieldArray` for dynamic lists of fields. Always use
`key={field.id}` (not the index) so React correctly identifies the elements.

```tsx
const { fields, append, remove } = useFieldArray({
  control,
  name: 'beneficiaries',
});
{
  fields.map((field, index) => (
    <BeneficiaryRow
      key={field.id}
      index={index}
      control={control}
      onRemove={() => remove(index)}
    />
  ));
}
```

---

### 7.10 Async flows with try/catch and fallback UI (MEDIUM)

When an `async` function controls navigation, loading state, or mutations,
it must catch failures explicitly. If a promise rejects without handling, the
UI may freeze, lose the error state, or skip the fallback path.

```tsx
const handleContinue = useCallback(async () => {
  try {
    const result = await executePayment(accountId, accountClabe);

    if (!result.success) {
      navigation.navigate(LossMitigationToolRoutes.Error, {
        error: result.error,
      });
      return;
    }

    navigation.navigate(LossMitigationToolRoutes.Ticket, {
      data: buildTicket(result),
    });
  } catch (error) {
    navigation.navigate(LossMitigationToolRoutes.Error, {
      error: normalizeError(error),
    });
  }
}, [accountClabe, accountId, executePayment, navigation]);
```

**Practical rule:** every `await` that affects navigation, loading, or
persistence must have `try/catch`. If a flow cannot recover, move it to an
error screen/modal or complete it with an `ErrorBoundary` for render errors.

---

### 7.11 Form submit: handleSubmit + isValid, effects in the view-model (HIGH)

Gate the submit with RHF's `handleSubmit` so the action never runs with invalid
data, drive the button's disabled state from `formState.isValid` (optionally
combined with domain flags), and keep the gateway call, loading, and error in
the screen's view-model — never in render.

```tsx
const { uiState, createNewPassword } = useCreateNewPasswordScreenViewModel();
const {
  handleSubmit,
  formState: { isValid },
} = useForm<FormFields>({ mode: 'onChange', resolver: yupResolver(schema) });

<CanvasNavigationLoadingButton
  onPress={handleSubmit(createNewPassword)} // ✅ validates, then delegates
  disabled={!(uiState.areValidRequirements && isValid) || uiState.isLoading}
/>;
```

---

### 7.12 Dynamic Yup schema: runtime factory + useMemo + reset (MEDIUM)

When the fields are only known at runtime (a gateway returns field descriptors),
the schema cannot live at module scope. Build it with a **pure factory**,
memoize the schema and `defaultValues`, and `reset` the form when the fields
change. One `<Controller>` per field keyed by `field.id`, no inline `rules`.

```tsx
const schema = useMemo(() => createBeneficiarySchema(fields), [fields]);
const defaultValues = useMemo(
  () => Object.fromEntries(fields.map((f) => [f.id, strings.common.empty])),
  [fields]
);
const { control, reset } = useForm<FormFields>({
  resolver: yupResolver(schema),
  defaultValues,
});
useEffect(() => reset(defaultValues), [defaultValues, reset]); // ✅ re-seed on change
```

This differs from `useFieldArray` (7.9), which repeats one fixed shape N times;
here each field has its own id, label, and rules coming from data. Use the
module-scope schema (7.6) only for build-time fields.

---

## 8. Navigation

### 8.1 Native Stack Navigator with TypeScript (HIGH)

Use `@react-navigation/native-stack` (not `@react-navigation/stack`) and
define `RootStackParamList` for compile-time route typing.

```tsx
type RootStackParamList = { Home: undefined; Profile: { userId: string } };
type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const Stack = createNativeStackNavigator<RootStackParamList>();
```

---

## 9. Animations

### 9.1 GPU animations: transform and opacity (HIGH)

Only `transform` and `opacity` are GPU-safe with `useNativeDriver: true`.
Never animate `width`, `height`, `margin`, or absolute position.

```tsx
Animated.timing(animScale, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true, // ✅
}).start();

<Animated.View
  style={{ transform: [{ scaleY: animScale }], opacity: animOpacity }}
>
  {content}
</Animated.View>;
```

---

## 10. Conventions

> Note: file naming (kebab-case), TypeScript suffixes and the hook `use`
> prefix are audited in the `react-native-scotia-movil-mx-architecture-skills`
> package (Names and Presentation structure categories).

---

### 10.1 M3 Design Tokens in 3 layers (HIGH)

1. `canvasBaseColors` — base palette
2. Color Scheme roles (primary, onPrimary, surface, …) — derived from the palette
3. Components — consume only theme roles, never raw colors

Fix order for a hardcoded color: `canvasTheme.colorSemantic.*` through the
canvas-core theme hook first; `values/colors.ts` only when the design system
has no equivalent.

---

### 10.2 ThemeProvider with separate contexts (HIGH)

- State as `ThemeName | undefined` (not raw colors)
- `useColorScheme()` as fallback
- Separate `ThemeTokensContext` and `ThemeDispatchContext` to avoid re-renders

---

### 10.3 pnpm with security configuration (HIGH)

```ini
# .npmrc
minimumReleaseAge=1440   # 24h quarantine for new packages
blockExoticSubdeps=true  # blocks sub-deps with non-standard distribution formats
```

---

### 10.4 Permissions in native manifests (HIGH)

- iOS: `NSXxxUsageDescription` must be specific and contextual
- Android 13+: use `READ_MEDIA_IMAGES` instead of `READ_EXTERNAL_STORAGE`
- Add `<uses-feature android:required="false">` to filter devices

---

### 10.5 `__DEV__` guard for logs (HIGH)

All `console.log` calls must be inside `if (__DEV__)`. Use a
`createLogger(tag)` factory to avoid repetition. Never log PII (passwords,
tokens, account numbers).

---

_Generated by react-native-scotia-movil-mx-code-quality-skills v1.0.0_
