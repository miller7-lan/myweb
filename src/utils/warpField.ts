/*
 * The wormhole's streaking stars, drawn on one 2D canvas. Each star is an
 * angle and a distance from the centre; every frame it moves outward (or
 * inward) in proportion to its distance, and is drawn as a line whose length
 * grows with the speed, so slow drift turns into warp streaks. GSAP tweens
 * the public `state`; the loop only runs between start() and stop().
 */

export type WarpState = {
  /** 0–1: how black the background behind the stars is. */
  bg: number;
  /** 0–1: the stars' opacity. */
  alpha: number;
  /** Rough streak speed; 0 is still, 3 is full warp. */
  speed: number;
  /** 1 flies outward (into the wormhole), -1 inward (back out of it). */
  dir: 1 | -1;
  cx: number;
  cy: number;
};

type Star = { angle: number; dist: number; tint: number; width: number };

export function createWarpField(canvas: HTMLCanvasElement, color: string) {
  const context = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const state: WarpState = { bg: 0, alpha: 0, speed: 0, dir: 1, cx: width / 2, cy: height / 2 };
  const reach = Math.hypot(width, height);
  const count = width < 768 ? 90 : 170;
  const stars: Star[] = Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    dist: Math.pow(Math.random(), 0.7) * reach * 0.6,
    tint: Math.random(),
    width: 0.6 + Math.random() * 1.4,
  }));

  let frame = 0;
  let last = 0;

  const step = (now: number) => {
    frame = window.requestAnimationFrame(step);
    if (!context) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    if (state.bg > 0) {
      context.fillStyle = `rgba(0, 0, 0, ${state.bg})`;
      context.fillRect(0, 0, width, height);
    }
    if (state.alpha <= 0) return;

    context.lineCap = 'round';
    for (const star of stars) {
      const velocity = state.speed * (star.dist * 1.6 + 40);
      star.dist += velocity * dt * state.dir;
      if (state.dir > 0 && star.dist > reach * 0.75) star.dist = 4 + Math.random() * 40;
      if (state.dir < 0 && star.dist < 4) star.dist = reach * (0.4 + Math.random() * 0.35);

      const length = Math.min(star.dist * 0.6, 4 + state.speed * star.dist * 0.18);
      const cos = Math.cos(star.angle);
      const sin = Math.sin(star.angle);
      const tail = star.dist - length * state.dir;
      context.strokeStyle = star.tint > 0.55 ? color : '#f2f6ff';
      context.globalAlpha = state.alpha * Math.min(1, star.dist / 120);
      context.lineWidth = star.width * (0.6 + Math.min(1.4, star.dist / 400));
      context.beginPath();
      context.moveTo(state.cx + cos * tail, state.cy + sin * tail);
      context.lineTo(state.cx + cos * star.dist, state.cy + sin * star.dist);
      context.stroke();
    }
    context.globalAlpha = 1;
  };

  return {
    state,
    start() {
      if (!frame) frame = window.requestAnimationFrame(step);
    },
    stop() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      context?.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
