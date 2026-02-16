# Patterns

Expression-level patterns for concise, readable code.

---

## 1. Destructuring

**Parameter destructuring** — extract props directly in the function signature:

```typescript
export function Chart({
  className,
  chartWidth,
  chartHeight,
  centerX: inputCenterX,
  centerY: inputCenterY,
  children,
}: Props) {
```

**Rename on destructure** — use only when the raw prop and a derived value would share the same name:

```typescript
// centerX is renamed to inputCenterX because the component computes outputCenterX
centerX: inputCenterX,
// ...
const outputCenterX = inputCenterX ?? chartWidth / 2;
```

**Context destructuring** — pull multiple values in one statement:

```typescript
const {
  tableContainerRef,
  listContainerRef,
  createPrompt,
  setCreatePrompt,
  cards,
  setCards,
} = useContext(DeskContext);
```

---

## 2. Nullish Coalescing (`??`) and Optional Chaining (`?.`)

Replace verbose null checks with single expressions:

```typescript
// Default values
const leftHiragana = leftWord.hiragana ?? leftWord.japanese;
const outputCenterX = inputCenterX ?? chartWidth / 2;

// Safe access
const allCards = tableContainerRef.current?.querySelectorAll("[data-card]");
const clickedCards = [...(allCards ?? [])].filter((card) => { ... });
```

---

## 3. Ternaries for Inline Decisions

Use ternaries for short conditional assignments. Nested ternaries are acceptable when mapping multiple states:

```typescript
// Simple boolean-to-value
const largeArcFlag = toAngle - fromAngle >= Math.PI ? 1 : 0;

// Three-state mapping (undefined -> 0, empty -> 1, has value -> parsed)
const thousandValue =
  thousandText !== undefined
    ? thousandText
      ? parseDigit(thousandText)
      : 1
    : 0;
```

---

## 4. The `in` Operator for Discriminated Props

Use `in` to narrow union types by checking property existence:

```typescript
const maximumX =
  "maximumX" in props
    ? props.maximumX
    : "maximum" in props
    ? props.maximum
    : undefined;
```

More explicit than checking `!== undefined` — it asks "does this prop exist at all?"

---

## 5. Array Literal + Spread + Filter as Builder

Build arrays from mixed sources and filter out `undefined`:

```typescript
const maximumXs = [
  coordinateInput.maximumX,
  coordinateInput.includeOriginX ? 0 : undefined,
  ...pointsInputs.map((input) => input.maximum.x),
].filter(t => !!t);

const maximumX = maximumXs.length > 0 ? Math.max(...maximumXs) : undefined;
```

This replaces imperative "if exists, push" logic.

---

## 6. `.map()` + `.filter(t => !!t)` — Early Return Inside Chains

For data pipelines where items may be disqualified midway:

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

Inside `.map()`, use `return undefined` to exit early for disqualified items. The trailing `.filter(t => !!t)` strips `undefined` and TypeScript narrows the type automatically.

---

## 7. Object Shorthand

Use shorthand when variable names match property names:

```typescript
return {
  path: projectPath,  // explicit — names differ
  name,               // shorthand — names match
  dependencies,       // shorthand — names match
};
```

---

## 8. Template Literals

Use template literals for string assembly:

```typescript
export function getDateText(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
```

---

## 9. Inline Functions

Define functions at the point of use rather than extracting them into named variables or separate declarations. If the logic is short and only used once, inline it directly:

```typescript
// Inline callbacks in chains
items.find((item) => item.level === level)
unitTexts.map((text) => text !== undefined ? (text ? parseMiddle(text) : 1) : 0)
array.filter((i) => i !== item)

// Inline in hooks
return useMemo(() => items.find((item) => item.level === level), [items, level]);

// Inline state updater
setState((oldState) => ({
  ...oldState,
  ratio: Math.min(oldState.ratio + elapsed / transition, 1),
}));

// Inline in JSX
<div className={`footers-Footer ${active ? "active" : ""}`}>
```

Do not extract a function just to name it. If the arrow function reads clearly at the call site, keep it there. Extracting adds indirection — the reader has to jump elsewhere to understand what happens. Inline keeps the logic where the reader is already looking.

Only extract when the function is reused or too complex to read inline.

---

## 10. Spread for Immutable Updates

Always spread old state and override changed fields. Never mutate:

```typescript
setState((oldState) => ({
  ...oldState,
  ratio: Math.min(oldState.ratio + elapsed / transition, 1),
}));
```

---

## Summary

| Pattern | When to use |
|---|---|
| Destructuring | Always for props, context, and multi-value returns |
| Rename on destructure | Only for name clash avoidance |
| `??` | Default values for nullable |
| `?.` | Safe property access on possibly-null objects |
| Ternary | Short conditional assignments, up to 2 levels |
| `in` operator | Narrowing union types by property existence |
| Array builder + filter | Building arrays from mixed/conditional sources |
| `.map()` + `.filter(t => !!t)` | Early exit inside functional chains |
| Object shorthand | When variable name matches property name |
| Template literals | All string assembly |
| Inline functions | Keep short, single-use functions at the call site |
| Spread | All state updates — never mutate |
