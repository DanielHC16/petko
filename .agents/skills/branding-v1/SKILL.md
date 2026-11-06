---
name: branding-v1
description: "The owner's personal design system (NieR geometric minimalism + metallic chrome): grayscale tokens, hairline 1px rules, square corners, uppercase mono micro-labels, a chrome gradient and a metallic cursor. Use when the user says on-brand, my branding, my brand, branding-v1, or asks to match the portfolio look."
---

# branding-v1

The brand kit ships in this skill folder. Paths below are relative to this `SKILL.md`.

| File | Use |
|---|---|
| `README.md` | Overview and the 8 design principles. Read first. |
| `design-system.md` | Full spec: tokens, typography, components, motion, a11y. |
| `tokens.css` | Drop-in CSS custom properties (light + dark). Source of truth for color. |
| `chrome.css` | Chrome text, chrome icon tile, and cursor styles. |
| `ChromeCursor.tsx` | The trailing metallic cursor (React). Port it for other frameworks. |
| `theme-toggle.md` | Before-paint theme + View Transitions cross-fade. |

## Steps

1. Read `README.md`, then the sections of `design-system.md` you need.
2. Copy `tokens.css` and `chrome.css` (and `ChromeCursor.tsx` for React) into the project's styles or components folder and import them globally. The project must not depend on this skill folder at runtime.
3. Map Tailwind theme colors to the tokens (`background`, `foreground`, `accent`, `muted`, `border`, `surface`) so utilities resolve to the brand.
4. Build from the patterns in `design-system.md` §4.

## Rules

- Reference colors via `var(--token)` only. No hard-coded hex, no brand hue: hierarchy comes from value, weight, and spacing.
- 1px hairline rules and borders, radius 0 (except pills, indicators, the cursor). No heavy shadows or filled cards.
- Chrome gradient only at the focal point: hero name, skill-tile icons, cursor. Never body text or large surfaces.
- Geist Sans 300 for prose, uppercase wide-tracked Geist Mono for labels, Exo 2 300 for the largest display type only.
- Motion uses `cubic-bezier(0.22, 1, 0.36, 1)`, nothing bounces, and all decorative motion respects `prefers-reduced-motion`.
- Light and dark are equals; apply the theme before first paint.

When this skill applies, it overrides `frontend-design`'s list of "generic defaults": hairlines, square corners, and mono labels are this brand's deliberate signatures, not templated choices.
