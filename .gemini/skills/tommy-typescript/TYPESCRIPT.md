# TypeScript

Type system usage, type organization, and configuration.

---

## 1. Interface vs Type

- **`interface`** for data shapes (objects, props, API contracts)
- **`type`** for unions, computed types, and mapped types

```typescript
// Interface — data shape
export interface Item {
  level: number;
  start: ItemStart;
  state: ItemState;
}

// Type — union
type AttendanceType = "arrive" | "leave";

// Type — complex/mapped
type Stored<T> = {
  [P in keyof T]: T[P] extends Vector3
    ? { x: number; y: number; z: number }
    : T[P];
};
```

---

## 2. String Enums

Always use string enums with explicit values. No numeric enums:

```typescript
export enum GestureMode {
  Build = "build",
  View = "view",
}

export enum BlockType {
  Domino = "domino",
  Bridge = "bridge",
}

export enum CardState {
  Idle = "idle",
  Creating = "creating",
  Dragging = "dragging",
  Deleting = "deleting",
}
```

PascalCase for enum name and members.

---

## 3. Discriminated Unions

Use a shared property as discriminant for polymorphic types:

```typescript
export interface DominoBlock {
  blockType: BlockType.Domino;
  position: Vector3;
  rotation: Euler;
}

export interface BridgeBlock {
  blockType: BlockType.Bridge;
  position: Vector3;
  rotation: Euler;
  length: number;
}

export type Block = DominoBlock | BridgeBlock;
```

---

## 4. Generics

Use generics for utility functions and reusable hooks:

```typescript
export async function infiniteTrain<TIn, TOut>(
  input: TIn[],
  func: (item: TIn, level: number) => Promise<{ output: TOut[]; next: TIn[] }>
) { ... }

export function without<T>(array: T[], item: T) {
  return array.filter((i) => i !== item);
}

export async function downloadJson<T>(path: string): Promise<T> {
  const response = await fetch(url);
  return await response.json() as T;
}
```

---

## 5. Utility Types

Commonly used utility types:

```typescript
// Record for maps
type Props = Record<Language, ReactNode>;
export interface ItemStart {
  name?: Record<Language, string>;
}

// Dispatch for state setters in context
setItems: Dispatch<SetStateAction<Item[]>>;

// PropsWithChildren for wrapper components
export function ControllerProvider({ children }: PropsWithChildren) { ... }

// RefObject for refs
export function useInput(ref: RefObject<Mesh>) { ... }
```

---

## 6. Inline Object Types in Context

Define context types inline with `createContext`, not in a separate interface:

```typescript
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

---

## 7. Type Organization

- **Shared types get their own file** — one type per file, named after the type (`item.ts`, `blockType.ts`)
- **Private types stay in the same file** — if used only once, define at bottom of that file
- **Props interfaces are always at bottom of the component file**

```
// Shared types — own files
item.ts          -> export interface Item { ... }
itemStart.ts     -> export interface ItemStart { ... }
itemState.ts     -> export enum ItemState { ... }
blockType.ts     -> export enum BlockType { ... }

// Private type — bottom of component file
export function AttendanceList({ className, attendances }: Props) { ... }

interface Props {
  className: string;
  attendances: AttendanceItem[];
}
```

---

## 8. Return Types

**Mostly inferred.** Only annotate return types when the inference is unclear or when the function is generic:

```typescript
// No return type — inferred (the norm)
export function useCurrentItem() {
  return useMemo(...);
}

// Explicit return type — needed for generic
export async function downloadJson<T>(path: string): Promise<T> { ... }
```

---

## 9. `as const` and Type Assertions

```typescript
// as const for literal return types
return { type: "download", value, index, refresh } as const;

// as Type[] for empty array initialization
allWords: [] as Word[],
```

---

## 10. `undefined` Over `null`

Avoid `null`. Use `undefined` to represent absent values. A value is either there or it is not — `undefined` means "absent," which is logically clear. `null` implies "intentionally empty," a distinction that rarely matters and adds a second bottom type to check against.

```typescript
// Good — undefined for absence
export function parseChineseNumber(text: string) {
  if (!text) {
    return undefined;
  }
  return parseNumber(`${text}`);
}

// Good — optional properties are undefined, not null
export interface ItemStart {
  name?: Record<Language, string>;
  successMessage?: Record<Language, string>;
}

// Good — ?? works naturally with undefined
const outputCenterX = inputCenterX ?? chartWidth / 2;
```

This also aligns with TypeScript's own conventions — optional parameters and properties are `T | undefined`, not `T | null`. Using `undefined` exclusively means `??`, `?.`, and optional properties all work consistently without mixed null checks.

---

## 11. Strict Configuration

All projects use strict mode. No exceptions:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler"
  }
}
```

Zero uses of `any`. Zero uses of `unknown`. The codebase is fully typed.

---

## Summary

| Aspect | Rule |
|---|---|
| Data shapes | `interface` |
| Unions / computed types | `type` |
| Enums | String enums, PascalCase, explicit values |
| Polymorphic types | Discriminated unions |
| Generics | For utility functions and reusable hooks |
| Context types | Inline with `createContext` |
| Shared types | One type per file |
| Private types | Bottom of the file that uses them |
| Props | `interface Props` at bottom of component file |
| Return types | Inferred unless generic or unclear |
| `null` | Avoid. Use `undefined` for absence |
| `any` | Never |
| Strict mode | Always |
