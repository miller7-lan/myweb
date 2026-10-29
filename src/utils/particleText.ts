/*
 * The finale's sentence, drawn as particles on one 2D canvas (like
 * warpField). The text is drawn once off screen and sampled into points;
 * each particle flies in from somewhere around the edge of the screen to
 * its point (form), then twinkles and drifts a little there. `swallow`
 * pulls them all into (sx, sy) in a tightening spiral. Faint stars twinkle
 * behind. GSAP tweens the public `state`; the loop only runs between
 * start() and stop().
 */

export type ParticleTextState = {
  /** 0–1: how far the particles have flown in. */
  form: number;
  /** 0–1: how far they have been pulled into (sx, sy). */
  swallow: number;
  sx: number;
  sy: number;
  /** 0–1: the faint stars behind the sentence. */
  stars: number;
  /** 0–1: everything's opacity. */
  alpha: number;
};

type Particle = {
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  /** When it sets off, as a share of `form`. */
  delay: number;
  /** How far its path bows out to one side. */
  curl: number;
  /** Its place in the swallow: 0 goes first. */
  pull: number;
  sprite: HTMLCanvasElement;
  size: number;
  phase: number;
  speed: number;
};

type Star = { x: number; y: number; size: number; alpha: number; phase: number };

const fontFamily = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", sans-serif';
/** A particle flies in over this share of `form`; the last ones set off at 1 - travel. */
const travel = 0.55;

const hexToRgb = (hex: string) => {
  const value = parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};

/** A soft dot with a white-hot centre, drawn once per colour and stamped for every particle. */
const makeSprite = (color: string) => {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const rgb = hexToRgb(color);
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.18, `rgba(${rgb}, 0.95)`);
  gradient.addColorStop(0.42, `rgba(${rgb}, 0.32)`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return canvas;
};

/** Draws `lines` centred on `centerY` and returns the points inside the letters, about `target` of them. */
const sampleText = (width: number, height: number, lines: string[], target: number) => {
  const wide = lines.length === 1;
  const fontSize = Math.min(
    wide ? Math.min(Math.max(width * 0.058, 30), 84) : Math.min(Math.max(width * 0.12, 28), 64),
    height * 0.13,
  );
  const lineHeight = fontSize * 1.4;
  const spacing = fontSize * 0.14;
  const centerY = height * 0.42;
  const firstLine = centerY - ((lines.length - 1) * lineHeight) / 2;
  const top = Math.max(0, Math.floor(firstLine - fontSize));
  const bottom = Math.min(height, Math.ceil(firstLine + (lines.length - 1) * lineHeight + fontSize));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = bottom - top;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { points: [], left: 0, right: width, centerY, top: centerY, bottom: centerY };

  context.fillStyle = '#fff';
  context.font = `600 ${fontSize}px ${fontFamily}`;
  context.textBaseline = 'middle';
  let left = width;
  let right = 0;
  lines.forEach((line, row) => {
    const chars = Array.from(line);
    const widths = chars.map((char) => context.measureText(char).width);
    const total = widths.reduce((sum, value) => sum + value, 0) + spacing * (chars.length - 1);
    let x = width / 2 - total / 2;
    left = Math.min(left, x);
    right = Math.max(right, x + total);
    chars.forEach((char, i) => {
      context.fillText(char, x, firstLine + row * lineHeight - top);
      x += widths[i] + spacing;
    });
  });

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let ink = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 128) ink += 1;
  const gap = Math.max(1.6, Math.sqrt(ink / target));
  const points: Array<{ x: number; y: number }> = [];
  for (let y = gap / 2; y < canvas.height; y += gap) {
    for (let x = gap / 2; x < canvas.width; x += gap) {
      if (data[(Math.floor(y) * canvas.width + Math.floor(x)) * 4 + 3] <= 128) continue;
      points.push({ x: x + (Math.random() - 0.5) * gap * 0.5, y: y + top + (Math.random() - 0.5) * gap * 0.5 });
    }
  }
  return {
    points,
    left,
    right,
    centerY,
    top: firstLine - fontSize * 0.6,
    bottom: firstLine + (lines.length - 1) * lineHeight + fontSize * 0.6,
  };
};

export function createParticleText(canvas: HTMLCanvasElement, options: { lines: string[]; colors: string[]; count: number }) {
  const context = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const text = sampleText(width, height, options.lines, options.count);
  const textWidth = Math.max(1, text.right - text.left);
  // Mostly starlight, with every planet's colour mixed in.
  const cool = ['#f4f7ff', '#dbe7ff', '#bfe3ff'].map(makeSprite);
  const tinted = options.colors.map(makeSprite);
  const reach = Math.hypot(width, height) * 0.5;
  const particles: Particle[] = text.points.map((point) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = reach * (0.7 + Math.random() * 0.6);
    return {
      fromX: width / 2 + Math.cos(angle) * distance,
      fromY: text.centerY + Math.sin(angle) * distance * 0.85,
      x: point.x,
      y: point.y,
      // The letters fill in from left to right.
      delay: ((point.x - text.left) / textWidth) * 0.28 + Math.random() * 0.17,
      curl: (Math.random() - 0.5) * reach * 0.4,
      pull: Math.random(),
      sprite: Math.random() < 0.3 ? tinted[Math.floor(Math.random() * tinted.length)] : cool[Math.floor(Math.random() * cool.length)],
      size: 4 + Math.random() * 3.5,
      phase: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 2.4,
    };
  });
  const starSprite = cool[0];
  const stars: Star[] = Array.from({ length: width < 768 ? 45 : 80 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 2.5 + Math.random() * 3,
    alpha: 0.12 + Math.random() * 0.35,
    phase: Math.random() * Math.PI * 2,
  }));

  const state: ParticleTextState = { form: 0, swallow: 0, sx: width / 2, sy: text.centerY, stars: 0, alpha: 1 };
  let frame = 0;
  let time = 0;
  let last = 0;

  const step = (now: number) => {
    frame = window.requestAnimationFrame(step);
    if (!context) return;
    time += last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    if (state.alpha <= 0) return;
    context.globalCompositeOperation = 'lighter';

    if (state.stars > 0) {
      for (const star of stars) {
        context.globalAlpha = state.alpha * state.stars * star.alpha * (0.6 + 0.4 * Math.sin(time * 0.8 + star.phase));
        context.drawImage(starSprite, star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
      }
    }

    for (const particle of particles) {
      const progress = Math.min(1, Math.max(0, (state.form - particle.delay) / travel));
      if (progress <= 0) continue;
      const eased = 1 - (1 - progress) ** 3;
      // Bow out to one side on the way in.
      const dx = particle.x - particle.fromX;
      const dy = particle.y - particle.fromY;
      const length = Math.hypot(dx, dy) || 1;
      const bow = Math.sin(Math.PI * eased) * particle.curl;
      let x = particle.fromX + dx * eased - (dy / length) * bow;
      let y = particle.fromY + dy * eased + (dx / length) * bow;
      // Settled: a little drift.
      x += Math.sin(time * 0.8 + particle.phase) * 0.45 * eased;
      y += Math.cos(time * 0.65 + particle.phase * 1.7) * 0.45 * eased;
      let alpha = Math.min(1, progress * 2.5) * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(time * particle.speed + particle.phase)));

      if (state.swallow > 0) {
        const pulled = Math.min(1, Math.max(0, state.swallow * 1.4 - particle.pull * 0.4)) ** 2;
        const turn = pulled * 3.4;
        const rx = x - state.sx;
        const ry = y - state.sy;
        x = state.sx + (rx * Math.cos(turn) - ry * Math.sin(turn)) * (1 - pulled);
        y = state.sy + (rx * Math.sin(turn) + ry * Math.cos(turn)) * (1 - pulled);
        alpha *= 1 - pulled * pulled;
      }

      context.globalAlpha = state.alpha * alpha;
      context.drawImage(particle.sprite, x - particle.size / 2, y - particle.size / 2, particle.size, particle.size);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  };

  return {
    state,
    /** Where the sentence sits on screen, in CSS px. */
    layout: { centerY: text.centerY, top: text.top, bottom: text.bottom },
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
