# CSS

Styling conventions, layout patterns, and animation techniques.

---

## 1. One CSS File Per Component

Every component gets its own `.css` file, co-located and identically named:

```
footers/
  Footer.tsx
  Footer.css
headers/
  Title.tsx
  Title.css
```

No shared stylesheets. No `styles/` folder. No CSS modules. No CSS-in-JS. Plain `.css` files imported directly:

```typescript
import "./Chart.css";
```

---

## 2. Selector Naming — Folder Path as Namespace

Class names mirror the component's folder path:

```css
.footers-Footer { ... }
.footers-nexts-Next { ... }
.settings-FormLevel { ... }
.clipboards-Clipboard { ... }
.desks-Desk { ... }
```

Pattern: `{folder}-{folder}-{Component}`. Not BEM — no `__element` or `--modifier`.

Child elements use short, flat names scoped by CSS nesting:

```css
.settings-FormLevel {
  .title { ... }
  .content { ... }
  .level { ... }
}
```

The top-level selector is globally unique (because it includes the path). Inner selectors are simple words — safe because they are scoped.

Root component has no prefix: `.App { ... }`

---

## 3. Native CSS Nesting

Every file is structured as a single top-level selector containing all children:

```css
.settings-Button {
  position: absolute;
  top: 0;
  right: 0;

  .content {
    background-color: #ffffffbb;
    border-bottom-left-radius: 40px;
    transition: 0.3s;

    &::before {
      width: 24px;
      height: 24px;
      background-image: url(./gear.svg);
      background-size: contain;
      content: "";
    }

    &:not(.active) {
      translate: 10px -10px;
      opacity: 0;
    }
  }
}
```

- `&` for pseudo-classes and pseudo-elements: `&:hover`, `&::before`, `&:not(.active)`
- `>` for direct children when needed
- Media queries nested inside the selector they affect, not at top level

```css
.item {
  @media (max-width: 600px) {
    width: 150px;
  }
  @media (min-width: 600px) {
    width: 250px;
  }
}
```

---

## 4. State Management — `.active` / `:not(.active)`

The primary mechanism for show/hide/animate. The active (visible) state is the base rule. The hidden state is defined under `&:not(.active)`:

```css
.footers-Footer {
  position: absolute;
  bottom: 0;
  transition: 0.3s;

  &:not(.active) {
    transform: translateY(100%);
    opacity: 0;
    pointer-events: none;
  }
}
```

Standard disappearance recipe: `transform` + `opacity: 0` + `pointer-events: none`.

For expand/collapse, use the `grid-template-rows: 0fr` to `1fr` technique:

```css
.trips-Slider {
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  transition: 0.3s;

  .content {
    min-height: 0;
    visibility: hidden;
    transition: 0.3s;
  }

  &.active {
    grid-template-rows: 1fr;

    .content {
      visibility: visible;
    }
  }
}
```

---

## 5. Layout

**Flexbox by default:**

```css
.App {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}
```

**Grid for specific cases:**
- Two-dimensional layouts (rows + columns)
- Animated height transitions (`0fr` -> `1fr`)

**Absolute positioning** only for overlays and floating elements, not general layout.

---

## 6. Global Reset — Minimal and Custom

No normalize.css. No reset library. Each project has a small `index.css`:

```css
* {
  box-sizing: border-box;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

html, body {
  margin: 0;
  padding: 0;
}
```

Link reset:

```css
a {
  color: inherit;
  &:not(:hover) {
    text-decoration: none;
  }
}
```

---

## 7. Colors

- **Inline hex values** — no CSS variables, no design tokens
- **8-digit hex for transparency** (`#rrggbbaa`):

```css
background-color: #ffffffbb;    /* white, ~73% opacity */
background-color: #00000022;    /* black, ~13% opacity */
border-color: #8884;            /* 4-digit shorthand */
```

- **Gradients** for colored elements: saturated-to-pastel at consistent angle

```css
background: linear-gradient(100deg, #0ccda3cc, #c1fcd3cc);
```

---

## 8. Typography

- **One Google Font per project**, set on `html`/`body`, inherited everywhere
- **`font-family: inherit`** on inputs so form elements match
- **Viewport-responsive sizing** with `min()` for full-screen interfaces:

```css
font-size: min(8vw, 5vh);
```

- **Fixed `px`** for tool-like interfaces
- **No `rem`** — either viewport units or px

---

## 9. Transitions and Animations

**Standard transition: `0.3s`** — applied to all animatable properties:

```css
transition: 0.3s;
```

**Staggered delays** for cascade effects:

```css
.blue   { transition: 0.3s; }
.yellow { transition: 0.3s 0.1s; }
.purple { transition: 0.3s 0.2s; }
.brown  { transition: 0.3s 0.3s; }
```

**Playful easing** with overshoot:

```css
transition: 0.1s cubic-bezier(0.63, 0.07, 0.58, 2.02);
```

**Keyframe names namespaced** like selectors:

```css
@keyframes blocks-Hint-arrow {
  0%   { transform: translateY(0); }
  100% { transform: translateY(10%); }
}
```

**Transform-based animations only** — `transform`, `translate`, `scale`, `rotate`, `opacity`. No width/height/top/left animations. GPU-composited for smooth 60fps.

---

## 10. Pseudo-Elements for Icons

Icons use `::before`/`::after` with SVG background images instead of `<img>` tags:

```css
&::before {
  display: block;
  width: 24px;
  height: 24px;
  background-image: url(./gear.svg);
  background-size: contain;
  background-repeat: no-repeat;
  content: "";
}
```

Decorative indicators also use pseudo-elements:

```css
&::after {
  position: absolute;
  bottom: 0;
  height: 2px;
  background-color: #dcc;
  content: "";
  transition: 0.3s;
}
```

---

## 11. Zero Comments

No comments in CSS files. The selector names and nesting structure communicate intent.

---

## 12. File Size

Most CSS files are under 30 lines:

| Size | Proportion |
|---|---|
| 1-10 lines | ~40% |
| 11-30 lines | ~35% |
| 31-60 lines | ~20% |
| 60-110 lines | ~5% |

A 3-line CSS file is normal:

```css
.scenes-Scene {
  background: linear-gradient(#e4e0ba, #f7d9aa);
}
```

---

## Summary

| Aspect | Rule |
|---|---|
| File organization | One `.css` per component, co-located |
| Selector naming | Folder path namespace: `.folder-Component` |
| Child selectors | Short names scoped by nesting |
| Nesting | Native CSS nesting, one top-level selector per file |
| State | `.active` / `:not(.active)` with transitions |
| Layout | Flexbox default, grid for 2D and height animations |
| Reset | Custom minimal, no library |
| Colors | Inline hex, 8-digit for transparency |
| Typography | One font per project, `min(vw, vh)` or px |
| Transitions | `0.3s` standard, staggered delays, cubic-bezier for bounce |
| Animations | Transform-based only (GPU-composited) |
| Icons | `::before`/`::after` with SVG background |
| Comments | Zero |
| File size | 75% under 30 lines |
