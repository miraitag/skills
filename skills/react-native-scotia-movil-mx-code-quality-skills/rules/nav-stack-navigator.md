---
title: Native Stack Navigator with TypeScript
impact: HIGH
impactDescription: native OS transitions without jank; compile-time route typing
tags: navigation, native-stack, TypeScript, RootStackParamList, transitions
---

## Native Stack Navigator with TypeScript

**Impact: HIGH**

> **Scope:** native-stack vs JS stack, the ParamList passed as the navigator
> generic, typed screen props and typed `navigate()` calls. Navigator / params
> *files*, where the ParamList is declared and "no logic in the navigator" are
> the architecture rule `navigation-conventions`.

`@react-navigation/native-stack` uses UINavigationController (iOS) and
FragmentManager (Android) — transitions on the native thread without JavaScript.
`RootStackParamList` guarantees that route names and param types are correct at
compile time.

**Incorrect (JS stack + no route typing):**

```tsx
import { createStackNavigator } from '@react-navigation/stack'; // ❌ JS stack

const Stack = createStackNavigator(); // ❌ No typing

const HomeScreen = ({ navigation }: { navigation: any }) => (
  // ❌ any
  <Pressable onPress={() => navigation.navigate('Profile', { userId: '123' })}>
    {/* TypeScript does not validate the route name or the params */}
  </Pressable>
);
```

**Correct (native-stack + typed RootStackParamList):**

```tsx
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

// ✅ Typed contract of all routes and their parameters
type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: { section?: string };
};

type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type ProfileProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const Stack = createNativeStackNavigator<RootStackParamList>();

const HomeScreen = ({ navigation }: HomeProps) => (
  <Pressable
    // ✅ TypeScript validates the route name and param types
    onPress={() => navigation.navigate('Profile', { userId: 'user-42' })}
  >
    <Text>{strings.home.viewProfile}</Text>
  </Pressable>
);

const ProfileScreen = ({ route }: ProfileProps) => (
  // ✅ route.params.userId typed as string
  <Text>
    {strings.profile.userLabel} {route.params.userId}
  </Text>
);

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          animation: 'ios_from_right', // ✅ Native OS animation
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

Reference: [Native Stack Navigator — React Navigation](https://reactnavigation.org/docs/native-stack-navigator)

**In this repo:** the UI library does not include navigation; the integration
harness is Storybook (`example/.rnstorybook`). This rule applies to the host app
that consumes the components within its screens.
