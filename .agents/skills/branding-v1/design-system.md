# BRANDING — Design system spec

The complete reference for the NieR + metallic chrome identity. Pair this with the
drop-in files in this folder: `tokens.css`, `chrome.css`, `ChromeCursor.tsx`,
`theme-toggle.md`.

## 1. Color tokens

See `tokens.css` for the full light/dark definitions. Reference everything via
`var(--token)` — never hardcode hex in components. The palette is **grayscale only**;
there is no brand hue.

| Token | Use for |
|-------|---------|
| `--background` | Page background, scrollbar track |
| `--foreground` | Primary text, strong headings |
| `--accent` | Hover color, diamonds, focus ring, active indicators |
| `--accent-soft` | Inactive indicators, selection background, subtle fills |
| `--muted` | Secondary text, metadata, scrollbar thumb, inactive labels |
| `--border` | 1px rules, tile/button borders, grid overlay lines |
| `--surface` | Cards/panels that lift slightly off the background |
| `--chrome-1..6` | Metallic gradient stops (top → bottom) |
| `--chrome-sheen`, `--chrome-sheen-hover` | Diagonal sweep highlight on tiles |

**Rule:** if a design calls for a "primary color," use `--accent`. If it calls for a
highlight, use the chrome gradient — not a hue.

## 2. Typography

Three families, exposed as CSS variables:

- **`--font-sans` = Geist** — all body copy and UI text. Base weight **300**,
  line-height **1.6**. Default `body` font.
- **`--font-mono` = Geist Mono** — micro-labels, section numbers, category headings,
  tags, code. Always **UPPERCASE** with wide tracking for labels.
- **`--font-display` = Exo 2 (weight 300)** — the hero name / largest display type only.

### Type recipes
```css
/* Body (default) */
font-family: var(--font-sans), system-ui, sans-serif;
font-weight: 300;
line-height: 1.6;

/* Mono micro-label */
font-family: var(--font-mono);
font-size: 0.75rem;            /* 9–10px for the smallest tile labels */
text-transform: uppercase;
letter-spacing: 0.18em;         /* 0.04em on tiny tile labels */
font-weight: 600;
color: var(--foreground);       /* or --muted when inactive */
```

Next.js loading (`next/font/google`): `Geist`, `Geist_Mono`,
`Exo_2({ weight: ["300"] })`, each as a CSS variable on `<body>`.

## 3. The metallic chrome system (signature)

Three expressions of the one flourish. All live in `chrome.css`.

### 3.1 Chrome text (`.text-chrome`)
Vertical metallic gradient clipped to text, plus a radial highlight that follows the
pointer (driven by `ChromeCursor` via `--chrome-mx/--chrome-my` and `--chrome-glow`).
Reserve for the single largest piece of brand type (the hero name). Degrades to a solid
color without `background-clip:text`, and to `currentColor` in forced-colors mode.

### 3.2 Chrome icon tile (`.skill-tile`)
Square, 1px border, faint accent-tinted fill. The icon is filled with the chrome
gradient via a shared SVG `<linearGradient id="skills-chrome-gradient">` and
`fill: url(#skills-chrome-gradient) currentColor`. A diagonal light sweep crosses on
hover; the border lifts to `--accent`. Define the gradient once per page as a zero-size
SVG so the `url()` reference stays valid:

```html
<svg width="0" height="0" aria-hidden="true" style="position:absolute">
  <defs>
    <linearGradient id="skills-chrome-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--chrome-1)" />
      <stop offset="35%"  stop-color="var(--chrome-2)" />
      <stop offset="49%"  stop-color="var(--chrome-3)" />
      <stop offset="51%"  stop-color="var(--chrome-4)" />
      <stop offset="70%"  stop-color="var(--chrome-5)" />
      <stop offset="100%" stop-color="var(--chrome-6)" />
    </linearGradient>
  </defs>
</svg>
```

### 3.3 Chrome cursor (`.chrome-cursor` + `ChromeCursor.tsx`)
**This is core to the identity — always preserve it.** Two layers:

- **Dot** (`.chrome-cursor__dot`): an 8px silver bead with a bright top-left highlight
  (`radial-gradient(circle at 35% 30%, #fff, --chrome-2, --chrome-4)`) and a thin dark
  rim. It replaces the native cursor and tracks the pointer **exactly**.
- **Ring** (`.chrome-cursor__ring`): a 28px conic-gradient metallic ring (masked to a
  ring shape) plus a soft fill. It **trails** the pointer with eased follow (`EASE 0.22`,
  refresh-rate independent).

Interaction states (set as `data-*` on the root by the component):
- `data-visible` — fades the cursor in/out as the pointer enters/leaves the page.
- `data-hover="true"` — over an interactive element → ring + fill scale to ~1.5.
- `data-down="true"` — pointer pressed → ring shrinks (~0.85), or ~1.3 while also hovering.

Enablement & safety:
- Only on `(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`.
- Native cursor hidden via `html.chrome-cursor-active` **only while active**; text inputs
  keep the I-beam; teardown restores the native cursor.
- Hidden entirely in `forced-colors` mode.
- The component also feeds the pointer position into every `.text-chrome` element so the
  chrome-text highlight follows the cursor.

Mount once at the app root, after page content:
```tsx
// app/layout.tsx (or your root)
<body>
  {children}
  <ChromeCursor />
</body>
```

## 4. Signature components & patterns

### 4.1 Section number divider
```html
<div class="flex items-center gap-4">
  <div class="w-20 h-px bg-border"></div>
  <span class="text-xs font-mono text-muted">04</span>
  <div class="w-20 h-px bg-border"></div>
</div>
```

### 4.2 Rotated-diamond marker
7px square, rotated 45°, 1px accent border; fills with `--accent` on hover. Used to
bracket list items (`◇ — label — ◇`).
```css
.diamond {
  width: 7px; height: 7px;
  border: 1px solid var(--accent);
  transform: rotate(45deg);
  transition: background-color 0.2s;
}
.group:hover .diamond { background-color: var(--accent); }
```

### 4.3 Thin grid background
Faint overlay of evenly spaced 1px lines on both axes at ~20% opacity using `--border`.
Signals the "technical blueprint" mood.

### 4.4 Pill indicators (carousel / tabs)
~3px rounded bars; active bar widens and switches to `--accent`, inactive uses
`--accent-soft`. Animate width.

### 4.5 Buttons / controls
Square, 1px border, no fill, no radius. Border `--border` → `--accent` on hover; the
icon/text shifts `--muted` → `--accent`.

## 5. Motion language

- **House easing:** `cubic-bezier(0.22, 1, 0.36, 1)` — entrances, sheens, cursor.
- **UI easing:** `cubic-bezier(0.4, 0, 0.2, 1)` — view/opacity changes, theme cross-fade.
- **Durations:** 0.2–0.3s hover feedback, 0.35–0.55s entrances, ~0.5s page theme fade.
- **Entrance patterns:** fade-up (`opacity 0→1`, `translateY 6–20px→0`) or stagger-in from
  the left (`translateX -8px→0`) with ~40ms × index delay.
- **Always** gate decorative motion behind
  `@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`,
  and disable animations under `@media (prefers-reduced-motion: reduce)`.

## 6. Interaction & accessibility

- **Focus:** `outline: 2px solid var(--accent); outline-offset: 2px;` on every focusable
  element (in `tokens.css`).
- **Selection / scrollbar:** defined in `tokens.css`.
- **Forced colors:** chrome gradients and the custom cursor disable themselves; text
  falls back to `currentColor` / `CanvasText`.
- **Theme flash prevention + cross-fade:** see `theme-toggle.md`.
- **Custom cursor:** progressive enhancement only — never required for interaction.

## 7. Brand voice (copy)

Structured, thoughtful, understated, a little obsessive about detail. Short declarative
sentences. Sentence-case prose, UPPERCASE mono for labels. No exclamation points, no
hype words. Let the work and the geometry speak.
