'use client';

// BRANDING — the metallic chrome cursor. Verbatim copy of the site's
// components/ChromeCursor.tsx. Mount it once at the app root (after the page
// content), and include chrome.css for the matching .chrome-cursor* styles.
//
// Behavior preserved:
//   - Silver bead that replaces the native pointer (fine pointers only), with a
//     conic-gradient ring that trails behind it.
//   - Ring scales up on interactive hover, shrinks on press.
//   - Feeds the pointer position into .text-chrome elements (--chrome-mx/my) so
//     the chrome text highlight follows the cursor.
//   - No React state; writes transforms straight to the DOM via rAF.
//   - Fully gated behind (hover: hover) and (pointer: fine) and
//     (prefers-reduced-motion: no-preference); native cursor restored on teardown.

import { useEffect, useRef } from 'react';

// Only fine, hover-capable pointers with motion allowed get the ring.
const ENABLE_QUERY = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const INTERACTIVE =
  'a[href], button:not(:disabled), [role="button"], [role="tab"], label[for], select, summary, [tabindex]:not([tabindex="-1"])';

// Per-frame follow factor at 60fps; scaled by frame time so speed is refresh-rate independent.
const EASE = 0.22;
const FRAME_MS = 1000 / 60;

/**
 * Trailing metallic ring that accents the native cursor.
 * No React state: position and interaction states are written straight to the DOM.
 */
export default function ChromeCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const dot = dotRef.current;
    if (!root || !dot || typeof window === 'undefined') return;

    const mq = window.matchMedia(ENABLE_QUERY);
    let teardown: (() => void) | null = null;

    const attach = () => {
      let x = 0;
      let y = 0;
      let tx = 0;
      let ty = 0;
      let rafId = 0;
      let last = 0;
      let visible = false;

      const write = () => {
        root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      };

      const tick = (now: number) => {
        const dt = last ? Math.min(now - last, 64) : FRAME_MS;
        last = now;
        const k = 1 - Math.pow(1 - EASE, dt / FRAME_MS);
        x += (tx - x) * k;
        y += (ty - y) * k;

        if (Math.abs(tx - x) + Math.abs(ty - y) < 0.1) {
          x = tx;
          y = ty;
          write();
          rafId = 0;
          last = 0;
          return;
        }
        write();
        rafId = requestAnimationFrame(tick);
      };

      const setFlag = (key: 'hover' | 'down', value: boolean) => {
        const next = value ? 'true' : 'false';
        if (root.dataset[key] !== next) root.dataset[key] = next;
      };

      const hide = () => {
        visible = false;
        root.dataset.visible = 'false';
        dot.dataset.visible = 'false';
        setFlag('hover', false);
        setFlag('down', false);
      };

      // Feed the pointer position to chrome text so its highlight follows the cursor.
      let glowRaf = 0;
      const updateGlow = () => {
        glowRaf = 0;
        document.querySelectorAll<HTMLElement>('.text-chrome').forEach((el) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--chrome-mx', `${tx - r.left}px`);
          el.style.setProperty('--chrome-my', `${ty - r.top}px`);
        });
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        tx = e.clientX;
        ty = e.clientY;
        if (!glowRaf) glowRaf = requestAnimationFrame(updateGlow);
        // The dot tracks the pointer exactly; only the ring trails.
        dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        if (!visible) {
          dot.dataset.visible = 'true';
          // Snap on (re)entry so the ring doesn't slide in from its last spot.
          x = tx;
          y = ty;
          write();
          visible = true;
          root.dataset.visible = 'true';
        }
        if (!rafId) rafId = requestAnimationFrame(tick);
      };

      const onOver = (e: PointerEvent) => {
        const hit = e.target instanceof Element && e.target.closest(INTERACTIVE) !== null;
        setFlag('hover', hit);
      };

      const onDown = () => setFlag('down', true);
      const onUp = () => setFlag('down', false);

      const html = document.documentElement;
      // Hide the native cursor only while the dot is wired up, so it always falls back safely.
      html.classList.add('chrome-cursor-active');
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerover', onOver, { passive: true });
      window.addEventListener('pointerdown', onDown, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      // Hide only when the pointer leaves the page; hiding on window blur would leave
      // no visible pointer at all (the native cursor is hidden while active).
      html.addEventListener('mouseleave', hide);

      return () => {
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerover', onOver);
        window.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp);
        html.removeEventListener('mouseleave', hide);
        cancelAnimationFrame(rafId);
        cancelAnimationFrame(glowRaf);
        html.classList.remove('chrome-cursor-active');
        root.dataset.visible = 'false';
        dot.dataset.visible = 'false';
        delete root.dataset.hover;
        delete root.dataset.down;
      };
    };

    const sync = () => {
      teardown?.();
      teardown = mq.matches ? attach() : null;
    };

    sync();
    mq.addEventListener('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
      teardown?.();
    };
  }, []);

  return (
    <>
      <div ref={rootRef} className="chrome-cursor" aria-hidden="true" data-visible="false">
        <span className="chrome-cursor__fill" />
        <span className="chrome-cursor__ring" />
      </div>
      <div ref={dotRef} className="chrome-cursor chrome-cursor--dot" aria-hidden="true" data-visible="false">
        <span className="chrome-cursor__dot" />
      </div>
    </>
  );
}
