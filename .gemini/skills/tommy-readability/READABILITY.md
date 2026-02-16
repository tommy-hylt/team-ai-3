# Readability

Naming conventions, formatting rules, and import organization.

---

## 1. Naming Conventions

### Identifiers

| Element | Convention | Example |
|---|---|---|
| Components | PascalCase | `Controller`, `SettingProvider` |
| Hooks | `use` + camelCase | `useCurrentItem`, `useAnimated` |
| Context objects | PascalCase + `Context` | `ControllerContext` |
| Provider components | PascalCase + `Provider` | `ControllerProvider` |
| Interfaces / Types | PascalCase, no `I` prefix | `Item`, `Props`, `Block` |
| Enums | PascalCase name + PascalCase members | `GestureMode.Build` |
| Functions | camelCase | `parseNumber`, `findRange` |
| Factory functions | `create` prefix | `createListener`, `createSnippet` |
| Optional operations | `try` prefix | `tryInsertStyleImport` |
| Variables | camelCase | `negativeText`, `componentName` |

### File Naming

| File type | Convention | Example |
|---|---|---|
| React component | PascalCase.tsx | `Controller.tsx`, `Chart.tsx` |
| Non-component module | camelCase.ts | `useCurrentItem.ts`, `parseNumber.ts` |
| Type-only file | camelCase.ts | `item.ts`, `gestureMode.ts` |
| CSS file | Matches component name | `Controller.css`, `Chart.css` |

### Folder Naming

Lowercase plural: `controllers/`, `stages/`, `settings/`, `blocks/`

---

## 2. Formatting

| Aspect | Rule |
|---|---|
| Brace style | K&R (opening brace on same line) |
| Indentation | 2 spaces |
| Semicolons | Always |
| Quotes | Double quotes |
| Trailing commas | Yes, in multiline structures |

---

## 3. Function Declaration Style

- **`function` keyword** for top-level exports and named functions — enables hoisting
- **Arrow functions** only for inline callbacks

```typescript
// Top-level: function keyword
export function parseNumber(text: string) { ... }
export function useCurrentItem() { ... }

// Callbacks: arrow function
items.find((item) => item.level === level)
useMemo(() => ({ input, setInput }), [input])
```

---

## 4. Import Organization

Imports are grouped in this order, with no blank lines between groups:

1. **React / framework imports**
2. **Third-party library imports**
3. **CSS import**
4. **Local relative imports** (components, then utilities)

```typescript
import { PropsWithChildren, useMemo, useState } from "react";
import ReactGa4 from "react-ga4";
import "./App.css";
import { Controller } from "./controllers/Controller";
import { ControllerProvider } from "./controllers/ControllerProvider";
import { useStoredItems } from "./useStoredItems";
```

**Named exports preferred.** Only `App` uses `export default`. Everything else uses named exports.

---

## 5. Blank Lines

Use blank lines to create visual groups within a function:

```typescript
export function ControllerProvider({ children }: PropsWithChildren) {
  const { items, setItems } = useStoredItems();

  const { levels, setLevels } = useStoredLevels();

  const [gestureMode, setGestureMode] = useState(GestureMode.Build);

  return ( ... );
}
```

Between interface members for breathing room:

```typescript
export interface Item {
  level: number;

  start: ItemStart;

  state: ItemState;

  build: ItemBuild;

  round: number;
}
```

In context definitions, group related state pairs (value + setter):

```typescript
export const ControllerContext = createContext<{
  items: Item[];
  setItems: Dispatch<SetStateAction<Item[]>>;

  levels: number[];
  setLevels: Dispatch<SetStateAction<number[]>>;

  gestureMode: GestureMode;
  setGestureMode: (mode: GestureMode) => void;
}>({ ... });
```

---

## 6. JSX Formatting

- Self-closing tags for childless components: `<Controller />`
- Short props inline: `<Editor className="editor" />`
- Long props multiline, each on its own line
- Wrap return JSX in parentheses: `return ( <div>...</div> );`

---

## Summary

| Aspect | Rule |
|---|---|
| Components | PascalCase |
| Functions / variables | camelCase |
| Hooks | `use` prefix |
| Factories | `create` prefix |
| Optional ops | `try` prefix |
| Component files | PascalCase.tsx |
| Other files | camelCase.ts |
| Folders | lowercase plural |
| Braces | K&R |
| Indent | 2 spaces |
| Semicolons | Always |
| Quotes | Double |
| Trailing commas | Yes |
| Exports | Named (no default except App) |
| Function style | `function` keyword top-level, arrow for callbacks |
| Blank lines | Between logical groups and interface members |
