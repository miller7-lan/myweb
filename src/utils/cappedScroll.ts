import { useEffect, type RefObject } from 'react';

/*
 * Mouse-wheel and trackpad scrolling with a speed limit, for the theme pages.
 * A hard fling used to outrun the glass filters and flash blank tiles, so the
 * wheel now sets a target and the page eases toward it no faster than
 * MAX_SPEED. Touch scrolling, the keyboard, the scrollbar and scripted scrolls
 * stay native; nested scrollers and widgets that handle the wheel themselves
 * (the skill graph zoom) are left alone.
 */

const MAX_SPEED = 7200; // px per second
const EASE = 14; // higher = catches up with the target faster

const lineHeight = 16;

const canScrollInside = (target: EventTarget | null, container: HTMLElement, deltaY: number) => {
  let node = target instanceof Element ? target : null;
  while (node && node !== container) {
    if (node instanceof HTMLElement && node.scrollHeight > node.clientHeight) {
      const overflowY = getComputedStyle(node).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        const atTop = node.scrollTop <= 0;
        const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
        if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
      }
    }
    node = node.parentElement;
  }
  return false;
};

export function useCappedScroll(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const container = ref.current;
    if (!container || !enabled) return;

    let target = container.scrollTop;
    let current = container.scrollTop;
    let frame = 0;
    let last = 0;

    const maxScroll = () => container.scrollHeight - container.clientHeight;

    const step = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const remaining = target - current;
      const eased = remaining * (1 - Math.exp(-EASE * dt));
      const limit = MAX_SPEED * dt;
      current += Math.max(-limit, Math.min(limit, eased));
      if (Math.abs(target - current) < 0.5) current = target;
      container.scrollTop = current;
      frame = current === target ? 0 : window.requestAnimationFrame(step);
      if (!frame) last = 0;
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (canScrollInside(event.target, container, event.deltaY)) return;
      const unit = event.deltaMode === 1 ? lineHeight : event.deltaMode === 2 ? container.clientHeight : 1;
      event.preventDefault();
      if (!frame) {
        current = container.scrollTop;
        target = current;
      }
      target = Math.max(0, Math.min(maxScroll(), target + event.deltaY * unit));
      if (!frame) frame = window.requestAnimationFrame(step);
    };

    // A scroll we did not make (scrollbar, keyboard, scripted scrollTo)
    // becomes the new resting point.
    const handleScroll = () => {
      // Our own writes land within a pixel of `current` (the browser rounds).
      if (Math.abs(container.scrollTop - current) <= 1.5) return;
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
      }
      current = container.scrollTop;
      target = current;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref, enabled]);
}
