# General Principles

Non-negotiable rules that apply to all code, all languages, all projects.

---

## 1. Zero Comments

Code must explain itself through naming and structure. Do not write comments.

- No inline comments, no block comments, no JSDoc, no TODO, no FIXME
- If the code is unclear, rewrite it — do not annotate it
- The only exception is compiler directives (e.g., `/// <reference types="vite/client" />`)

**How to replace a comment:**

```typescript
// Bad — comment explains unclear code
// Check if the text is a valid Chinese number and convert it
function convert(t) { ... }

// Good — the name carries the meaning
export function parseChineseNumber(text: string) {
  if (!text) {
    return undefined;
  }
  return parseNumber(`${text}`);
}
```

Types serve as documentation. A well-named interface eliminates any need for property comments:

```typescript
interface Props {
  className?: string;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
  fromAngle: number;
  toAngle: number;
}
```

---

## 2. Minimal Dependencies

Only use external libraries when they provide irreplaceable infrastructure value. If it is application logic, write it yourself.

**Acceptable dependencies:**
- Frameworks: React, Three.js
- Build tools: Vite, TypeScript
- Backend services: Firebase
- Selective utilities: lodash (only specific functions like `difference`, `isString`)

**Not acceptable:**
- Charting libraries when you can write SVG
- Animation libraries when you can use `requestAnimationFrame`
- State management libraries when React Context works
- Utility libraries for logic you can write in a few lines

Every production dependency must justify itself. Zero production dependencies is the ideal for utility/library projects.

---

## 3. Functional Chains Over Imperative Loops

Use `.map()`, `.filter()`, `.reduce()` (or LINQ `.Select()`, `.Where()` in C#, streams in Java) for data transformation. They express **what** the data becomes, not **how** to iterate.

```typescript
// Good — declarative chain
const unitValues = unitTexts.map((text) =>
  text !== undefined ? (text ? parseMiddle(text) : 1) : 0
);
const unitedSum = unitedValues.reduce((a, b) => a + b, 0);

// Avoid — imperative loop for the same logic
let sum = 0;
for (let i = 0; i < unitTexts.length; i++) {
  if (unitTexts[i] !== undefined) { ... }
}
```

**Use imperative loops only when:**
- Sequential `await` is required (each iteration must finish before the next)
- Side effects are the purpose (I/O, mutation)
- `yield return` / generators
- Graph/tree traversal with mutable state

---

## 4. Single File Focus

Each file does one thing. The filename is the function/component name. There is a 1:1 mapping between what the file is called and what it does.

**Typical file sizes:**
- Type/interface definition: 4-15 lines
- Single utility function: 3-25 lines
- Pure logic function: 30-80 lines
- React component: 20-70 lines
- Custom hook: 10-60 lines

**Split a file when:**
- The concept is independently nameable
- The code is reused across features
- The type is consumed by multiple files
- The file exceeds ~80 lines and contains distinct concepts

A file that contains a helper function is fine — but the helper must exist solely to support the main export. If the helper is independently meaningful, it gets its own file.

---

## 5. Early Returns

Handle exceptional cases first with `return`. The main logic flows straight through at the lowest indentation level. Maximum nesting depth: 2-3 levels.

```typescript
export function parseNumber(text: string) {
  const match = /.../.exec(text);

  if (!match) {
    return undefined;
  }

  const integerValue = integerText ? parseBig(integerText) : 0;

  if (integerValue === undefined) {
    return undefined;
  }

  const decimalMapped = decimalText ? mapDigit(decimalText) : "0";

  if (decimalMapped === undefined) {
    return undefined;
  }

  return negativeValue * (integerValue + decimalValue);
}
```

Parse, check, parse, check. The code reads as a straight line with exit ramps. Never nest the happy path inside conditions.

---

## 6. `.map()` + `.filter(t => !!t)` — Early Return Inside Chains

When transforming a collection where items may be disqualified midway, use `return undefined` inside `.map()` and strip them with `.filter(t => !!t)`:

```typescript
const dependencies = Object.entries(dependenciesMap || {})
  .map(([key, value]) => {
    if (!isString(value)) {
      return undefined;
    }
    if (!value.startsWith("file:")) {
      return undefined;
    }
    const relativePath = value.substring("file:".length);
    return { path: join(projectPath, relativePath), name: key };
  })
  .filter(t => !!t);
```

Modern TypeScript automatically narrows the type after `.filter(t => !!t)` — no type predicate or `isDefined` utility needed.

---

## Summary

| Principle | Rule |
|---|---|
| Zero comments | Never write comments. Rewrite unclear code instead |
| Minimal dependencies | Only irreplaceable infrastructure. Own your logic |
| Functional chains | `.map()/.filter()/.reduce()` for data. Loops only for async/side effects |
| Single file focus | One file = one concept. Filename = function name |
| Early returns | Guard first, happy path flat, max nesting 2-3 |
| `.map()` + `.filter(t => !!t)` | Early `return undefined` inside chains, filter strips them |
