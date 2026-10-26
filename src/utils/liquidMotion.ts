import { useEffect } from 'react';
import { glassSurfaceSelector } from './glassSurfaces';

/*
 * The "liquid" half of liquid glass, kept as restrained as iOS:
 *  - press: the glass sinks a little and springs back with a small overshoot;
 *  - hover (mouse only): the glass leans and stretches slightly toward the
 *    pointer, and a quick swipe leaves a short wobble as the spring settles.
 * Phones only get the press. Large panels and dialogs never move.
 * Uses the individual `scale` / `translate` properties so it composes with
 * whatever `transform` an element already animates.
 */

type Body = {
  element: HTMLElement;
  value: [number, number, number, number]; // scaleX, scaleY, translateX, translateY
  velocity: [number, number, number, number];
  target: [number, number, number, number];
  pressed: boolean;
  hovered: boolean;
};

const STIFFNESS = 320;
const DAMPING = 24; // under 2*sqrt(320) ≈ 36: one soft overshoot, then still
const PRESS_SCALE = 0.972;
const STRETCH = 0.014;
const LEAN = 2.2; // px
const MAX_WIDTH = 560;
const MAX_HEIGHT = 440;
const excluded = ".theme-bar, .guide-pet-panel, .announcement-card, .release-preview-card, [data-guide-id='project-detail']";
const rest: Body['value'] = [1, 1, 0, 0];

const movable = (element: HTMLElement) =>
  !element.matches(excluded) && element.offsetWidth <= MAX_WIDTH && element.offsetHeight <= MAX_HEIGHT;

const motionOff = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  document.querySelector("[data-visual-mode='silent']") !== null;

export function useLiquidMotion() {
  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const bodies = new Map<HTMLElement, Body>();
    let frame = 0;
    let last = 0;

    const bodyFor = (element: HTMLElement) => {
      let body = bodies.get(element);
      if (!body) {
        body = { element, value: [...rest], velocity: [0, 0, 0, 0], target: [...rest], pressed: false, hovered: false };
        bodies.set(element, body);
      }
      return body;
    };

    const surfaceAt = (target: EventTarget | null) => {
      if (!(target instanceof Element) || target.closest('input, textarea, select')) return null;
      const surface = target.closest<HTMLElement>(glassSurfaceSelector);
      return surface && movable(surface) ? surface : null;
    };

    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
      last = now;
      bodies.forEach((body, element) => {
        let moving = false;
        for (let i = 0; i < 4; i += 1) {
          const force = -STIFFNESS * (body.value[i] - body.target[i]) - DAMPING * body.velocity[i];
          body.velocity[i] += force * dt;
          body.value[i] += body.velocity[i] * dt;
          const threshold = i < 2 ? 0.0004 : 0.03;
          if (Math.abs(body.value[i] - body.target[i]) > threshold || Math.abs(body.velocity[i]) > threshold * 10) moving = true;
        }
        const [sx, sy, tx, ty] = body.value;
        element.style.scale = `${sx.toFixed(4)} ${sy.toFixed(4)}`;
        element.style.translate = `${tx.toFixed(2)}px ${ty.toFixed(2)}px`;
        if (!moving && !body.pressed && !body.hovered) {
          element.style.removeProperty('scale');
          element.style.removeProperty('translate');
          bodies.delete(element);
        }
      });
      frame = bodies.size ? window.requestAnimationFrame(step) : 0;
    };

    const wake = () => {
      if (frame) return;
      last = performance.now();
      frame = window.requestAnimationFrame(step);
    };

    const aim = (body: Body, pointerX?: number, pointerY?: number) => {
      if (body.pressed) {
        body.target = [PRESS_SCALE, PRESS_SCALE, 0, 0];
      } else if (body.hovered && pointerX !== undefined && pointerY !== undefined) {
        const rect = body.element.getBoundingClientRect();
        const ox = Math.max(-1, Math.min(1, ((pointerX - rect.left) / rect.width) * 2 - 1));
        const oy = Math.max(-1, Math.min(1, ((pointerY - rect.top) / rect.height) * 2 - 1));
        // Stretch along the pointer's axis and give a little back on the other, like a held droplet.
        body.target = [
          1 + Math.abs(ox) * STRETCH - Math.abs(oy) * STRETCH * 0.4,
          1 + Math.abs(oy) * STRETCH - Math.abs(ox) * STRETCH * 0.4,
          ox * LEAN,
          oy * LEAN,
        ];
      } else {
        body.target = [...rest];
      }
      wake();
    };

    let hoveredSurface: HTMLElement | null = null;

    const handlePointerMove = (event: PointerEvent) => {
      if (!finePointer || event.pointerType !== 'mouse' || motionOff()) return;
      const surface = surfaceAt(event.target);
      if (hoveredSurface && hoveredSurface !== surface) {
        const previous = bodyFor(hoveredSurface);
        previous.hovered = false;
        aim(previous);
      }
      hoveredSurface = surface;
      if (!surface) return;
      const body = bodyFor(surface);
      body.hovered = true;
      aim(body, event.clientX, event.clientY);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (motionOff()) return;
      const surface = surfaceAt(event.target);
      if (!surface) return;
      const body = bodyFor(surface);
      body.pressed = true;
      aim(body);
    };

    const release = (event: PointerEvent) => {
      bodies.forEach((body) => {
        if (!body.pressed) return;
        body.pressed = false;
        aim(body, event.clientX, event.clientY);
      });
    };

    const handleLeave = () => {
      if (!hoveredSurface) return;
      const body = bodyFor(hoveredSurface);
      body.hovered = false;
      hoveredSurface = null;
      aim(body);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', release, { passive: true });
    window.addEventListener('pointercancel', release, { passive: true });
    document.documentElement.addEventListener('pointerleave', handleLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      document.documentElement.removeEventListener('pointerleave', handleLeave);
      if (frame) window.cancelAnimationFrame(frame);
      bodies.forEach((_, element) => {
        element.style.removeProperty('scale');
        element.style.removeProperty('translate');
      });
    };
  }, []);
}
