# Project Structure

How to organize files, folders, and code within files.

---

## 1. Function Ordering Within Files

Every file follows this layout:

```
1. Imports
2. Exported data constants (if any — part of public API)
3. Main exported function / component
4. Private constants
5. Private helper functions
6. Interface / type definitions (at bottom)
```

The main export comes first. Supporting details follow. Use `function` declarations (not arrow function variables) so hoisting allows the main export to appear before helpers that it calls:

```typescript
// Main export first — this is what the reader came for
export function compareWord(leftWord: Word, rightWord: Word) {
  const compareLength = Math.min(leftHiragana.length, rightHiragana.length);
  for (let i = 0; i < compareLength; i++) {
    const letterCompare = compareLetter(leftHiragana[i], rightHiragana[i]);
    if (letterCompare) {
      return letterCompare;
    }
  }
  return Math.sign(leftHiragana.length - rightHiragana.length);
}

// Private constant — supporting detail
const orderedLetters = "あいうえお" + "かきくけこ" + /* ... */ "わをん";

// Private helper — supporting detail (hoisted, so it works above)
function compareLetter(leftLetter: string, rightLetter: string) {
  return Math.sign(orderedLetters.indexOf(leftLetter) - orderedLetters.indexOf(rightLetter));
}
```

**Exception:** When a constant is exported domain data, it comes before the main function because it is part of the public API.

**Props interfaces always go at the bottom** — they are reference material, not the main content:

```typescript
export function Chart({ className, chartWidth, chartHeight }: Props) {
  // component logic
}

interface Props {
  className?: string;
  chartWidth: number;
  chartHeight: number;
}
```

---

## 2. Project Structure Scales With Size

No one-size-fits-all template. The folder structure grows proportionally with the number of files.

**Tiny (1-6 files) — flat, no folders:**

```
src/
  index.ts
  simpleTrain.ts
  multiplyTrain.ts
  infiniteTrain.ts
```

**Small (8-20 files) — domain folders:**

```
src/
  index.ts
  parse/
    parseNumber.ts, parseBig.ts, parseSmall.ts, parseDigit.ts, mapDigit.ts
  to/
    toChinese.ts, toArabic.ts, printBig.ts, printSmall.ts
```

**Medium (25-60 files) — feature folders:**

```
src/
  App.tsx
  attendances/     <- self-contained feature
  clipboards/      <- self-contained feature
  treasuries/      <- self-contained feature
  firebases/       <- infrastructure
```

Each feature folder contains its components, hooks, types, and helpers together.

**Large (100+ files) — deep feature hierarchy:**

```
src/
  blocks/          <- shared types
  controllers/     <- app state (Context + Provider)
  stages/          <- feature folders
    stageA/        <- ~16 files per stage
    stageB1/ ... stageB5/
  footers/, headers/, languages/, settings/
```

---

## 3. Structural Rules

- **No barrel exports.** Import directly from the file that defines what you need. No `index.ts` re-export files.
- **No cross-cutting folders** like `src/components/`, `src/hooks/`, `src/types/`. Code lives with its feature.
- **No "utils" grab-bag.** Utility functions get their own named file within the feature that uses them, or in a `utilities/` folder if shared.
- **Context and Provider are separate files.** `ControllerContext.ts` (type) and `ControllerProvider.tsx` (implementation). The type file is importable without pulling in React.
- **Maximum folder depth: 3.** Never deeper.
- **Folder names: lowercase plural** — `controllers/`, `stages/`, `settings/`.

---

## 4. File Splitting Triggers

Split when any of these apply:

| Trigger | Example |
|---|---|
| Concept is independently nameable | `parseDigit.ts` — "parse a single digit" |
| Code is reused across features | Shared utility gets its own file |
| Type is consumed by multiple files | `ControllerContext.ts` — contract between modules |
| File exceeds ~80 lines with distinct concepts | Review and split if separable |

Do not split when the helper only makes sense in context of the main function — keep it private in the same file.

---

## 5. File Size Targets

| Category | Lines | Proportion |
|---|---|---|
| Tiny (1-10) | Type files, enums | ~30% |
| Small (11-30) | Single functions, simple hooks | ~35% |
| Medium (31-80) | Complex logic, standard components | ~25% |
| Large (81-150) | Complex interactive components | ~8% |
| Very large (150+) | Rare, genuine complexity | ~2% |

Over 65% of files should be 30 lines or fewer. Files over 80 lines should represent genuinely indivisible logic.

---

## Summary

| Aspect | Rule |
|---|---|
| File layout | Imports -> exported constants -> main export -> private helpers -> types at bottom |
| Hoisting | Use `function` declarations to place main export first |
| Props | Always at bottom of file |
| Folders | Scale with project size: flat -> domain -> feature -> deep hierarchy |
| Barrel exports | Never. Import directly from source files |
| Cross-cutting folders | Never. Code lives with its feature |
| Folder depth | Maximum 3 levels |
| Folder naming | Lowercase plural |
| Split trigger | Nameable, reused, shared type, or >80 lines |
