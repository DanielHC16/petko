# Theme behavior (preserve this)

Light and dark are equal first-class themes. Two behaviors are part of the brand feel
and should be carried into any project:

## 1. Apply the theme before first paint (no flash)

Put an inline script in `<head>` (before any stylesheet renders) that reads the saved
or system preference and sets `class="dark"` on `<html>` immediately. The portfolio
uses this exact snippet in `app/layout.tsx`:

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('theme');
      var d = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', d);
    } catch (e) {}
  })();
</script>
```

The loading screen and page then never flash light mode before hydration.

## 2. Cross-fade the whole page on toggle (View Transitions API)

The toggle flips `html.dark`, persists to `localStorage.theme`, and wraps the change in
`document.startViewTransition()` so the entire page cross-fades in one composited pass.
It falls back to an instant switch when the API is unsupported or reduced motion is on.

```ts
const apply = () => {
  document.documentElement.classList.toggle('dark', newTheme);
  localStorage.setItem('theme', newTheme ? 'dark' : 'light');
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (typeof document.startViewTransition === 'function' && !reduceMotion) {
  document.startViewTransition(apply);
} else {
  apply();
}
```

The cross-fade timing is set in `chrome.css`:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.5s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 3. Toggle button style

Fixed top-right, 40×40, 1px border that transitions `--border` → `--accent` on hover,
`bg-surface/50` with `backdrop-blur`, sun/moon line icon in `--muted` → `--accent`.
Square corners, no fill. Subscribe to the `html.dark` class (e.g. via `MutationObserver`
/ `useSyncExternalStore`) rather than mirroring theme in component state, so the
before-paint value and the toggle stay in sync.
