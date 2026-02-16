# React

Component patterns, state management, and hooks.

---

## 1. Context + Provider + Hook Pattern

The universal state management architecture. Three files per domain:

**Step 1 — Context file** (`ControllerContext.ts`):

```typescript
import { createContext, Dispatch, SetStateAction } from "react";

export const ControllerContext = createContext<{
  items: Item[];
  setItems: Dispatch<SetStateAction<Item[]>>;

  gestureMode: GestureMode;
  setGestureMode: (mode: GestureMode) => void;
}>({
  items: [],
  setItems: () => {},

  gestureMode: GestureMode.Build,
  setGestureMode: () => {},
});
```

**Step 2 — Provider file** (`ControllerProvider.tsx`):

```typescript
export function ControllerProvider({ children }: PropsWithChildren) {
  const { items, setItems } = useStoredItems();
  const [gestureMode, setGestureMode] = useState(GestureMode.Build);

  return (
    <ControllerContext.Provider
      value={useMemo(
        () => ({ items, setItems, gestureMode, setGestureMode }),
        [gestureMode, items, setItems]
      )}
    >
      {children}
    </ControllerContext.Provider>
  );
}
```

**Step 3 — Hook file** (`useCurrentItem.ts`):

```typescript
export function useCurrentItem() {
  const { items } = useContext(ControllerContext);
  const level = useCurrentLevel();

  return useMemo(
    () => items.find((item) => item.level === level),
    [items, level]
  );
}
```

The context file is pure types — importable without React. The provider file contains the implementation. The hook file provides a focused API for consumers.

---

## 2. `useMemo` for Context Values

**Always** wrap context provider values in `useMemo`. This prevents unnecessary re-renders of every consumer:

```typescript
<ControllerContext.Provider
  value={useMemo(
    () => ({ items, setItems, levels, setLevels }),
    [items, levels, setItems, setLevels]
  )}
>
```

---

## 3. Nested Providers in App

Compose providers by nesting in `App.tsx`:

```typescript
function App() {
  return (
    <div className="App">
      <DebugProvider>
        <ScoreProvider>
          <MenuProvider>
            <SceneProvider>
              <GameProvider>
                <AudioProvider>
                  <ServerProvider>
                    <Scene>
                      <Game />
                    </Scene>
                    <Menu />
                    <Header />
                  </ServerProvider>
                </AudioProvider>
              </GameProvider>
            </SceneProvider>
          </MenuProvider>
        </ScoreProvider>
      </DebugProvider>
    </div>
  );
}
```

No state management libraries (Redux, Zustand, MobX, Jotai, Recoil). Pure React Context.

---

## 4. Functional Components Only

Zero class components. All components are `function` declarations:

```typescript
export function Controller() {
  // hooks
  // return JSX
}
```

---

## 5. Custom Hook Composition

Hooks compose from smaller hooks:

```typescript
export function useCurrentItem() {
  const { items } = useContext(ControllerContext);
  const level = useCurrentLevel();  // another custom hook

  return useMemo(
    () => items.find((item) => item.level === level),
    [items, level]
  );
}
```

---

## 6. Component Props Patterns

**`PropsWithChildren`** for wrapper components:

```typescript
export function ControllerProvider({ children }: PropsWithChildren) { ... }
```

**`className` prop** for styling flexibility:

```typescript
<Editor className="editor" />
<Preview className="preview" />
```

**Props interface at the bottom** of the file (see STRUCTURE.md).

---

## 7. State Initialization

```typescript
// Enum default
const [gestureMode, setGestureMode] = useState(GestureMode.Build);

// With type parameter
const [input, setInput] = useState<Input>(firstInput);
```

---

## 8. No CSS-in-JS

All styling uses plain `.css` files imported directly:

```typescript
import "./App.css";
import "./Controller.css";
```

No styled-components, Emotion, Tailwind, or CSS modules.

---

## Summary

| Aspect | Rule |
|---|---|
| State management | Context + Provider + Hook (3-file pattern) |
| Context values | Always wrapped in `useMemo` |
| Providers | Nested in App.tsx |
| Components | Functional only, `function` keyword |
| Hooks | Compose from smaller hooks |
| Wrappers | `PropsWithChildren` |
| Styling flexibility | `className` prop |
| CSS | Plain `.css` imports, no CSS-in-JS |
| State libraries | None — pure React Context |
