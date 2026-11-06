# BRANDING — NieR + Metallic Chrome Design System

This folder is the canonical, portable brand kit for the Daniel Camacho portfolio.
**This website *is* the branding.** The identity is **NieR: Automata geometric
minimalism + metallic chrome**: a near-monochrome grayscale world, square hairline
geometry, uppercase mono micro-labels, and one recurring moment of shine — the chrome
gradient and the trailing metallic cursor.

Copy this whole folder into any project to carry the brand over. Everything here is
self-contained and framework-agnostic (the CSS and tokens work anywhere; the cursor
component is React/Next but the behavior is documented so it can be ported).

## What's in here

| File | Purpose |
|------|---------|
| `README.md` | This overview + the design principles. |
| `design-system.md` | Full spec: tokens, typography, components, motion, a11y. |
| `tokens.css` | Drop-in CSS custom properties (light + dark) — the source of truth for color. |
| `chrome.css` | The metallic chrome text, chrome icon tile, and **full cursor** styles, verbatim. |
| `ChromeCursor.tsx` | The trailing metallic cursor component, verbatim from the site. |
| `theme-toggle.md` | How the before-paint theme + page cross-fade works (preserve this behavior). |

## The brand in one breath

NieR geometric minimalism meets Y2K metallic chrome. Quiet, technical, precise.
Grayscale only — hierarchy comes from value, weight, and space, never hue. The single
flourish is chrome: a vertical metallic gradient on the hero name and skill icons, plus
a silver bead cursor with a trailing ring that reacts to interactive elements and feeds
a pointer-following highlight into the chrome text. Square corners, 1px rules, rotated
diamonds, numbered section dividers, and short eased motion that always respects
`prefers-reduced-motion`.

## Design principles

1. **Monochrome first.** No brand hue. Hierarchy = value + weight + spacing.
2. **Hairlines over boxes.** 1px rules and borders. Square corners (radius 0) except
   pills, indicators, and the circular cursor. No heavy shadows or filled cards.
3. **Chrome is the only flourish.** The metallic gradient (`--chrome-*`) appears only on
   the hero name, skill-tile icons, and the cursor. Never on body text or big surfaces.
4. **The metallic cursor is part of the identity.** A silver chrome bead replaces the
   native pointer (fine pointers only), trailed by a conic-gradient ring that scales on
   hover/press and drives the chrome text highlight. This is signature — preserve it.
5. **Mono for metadata, sans for prose.** UPPERCASE wide-tracked Geist Mono labels frame
   Geist Sans body copy; Exo 2 is reserved for the largest display type (the hero name).
6. **Restraint in motion.** House curve `cubic-bezier(0.22, 1, 0.36, 1)`. Nothing bounces.
   All decorative motion is gated behind hover/fine-pointer + reduced-motion guards.
7. **Geometry as decoration.** Rotated squares (diamonds), thin grid overlays, numbered
   dividers. No illustrations, no background gradients.
8. **Light and dark are equals.** Theme applied before first paint (no flash); switching
   cross-fades the whole page via the View Transitions API.

## How to apply to a new project

1. Import `tokens.css` and `chrome.css` into your global stylesheet.
2. Load fonts: Geist (sans, weight 300), Geist Mono, Exo 2 (weight 300, display only).
   Set `body` to Geist 300 / line-height 1.6.
3. If using Tailwind, map theme colors to the tokens (`background`, `foreground`,
   `accent`, `muted`, `border`, `surface`) so utilities resolve to the brand.
4. Drop in `ChromeCursor.tsx` (or port it) and mount it once at the root.
5. Build UI from `design-system.md` §4 patterns. Reach for chrome only at the focal point.
6. Keep it grayscale. If you're adding a color, stop — use `--accent` or chrome.
