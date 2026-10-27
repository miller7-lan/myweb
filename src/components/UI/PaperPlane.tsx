import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { petReact } from '../../utils/raid';

/*
 * After a message is sent from the signal form, a paper plane grows out of
 * the send button's icon, loops the loop twice and glides over to 星仔,
 * leaving a dashed trail (see launchPaperPlane in utils/raid.ts). 星仔
 * catches it and reads the letter; GuidePet draws that.
 */

type Point = { x: number; y: number };

const trailChunks = 8;
const trailLength = 260;
const trailDash = 12;
const growTime = 0.7;
const loops = 2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (from: number, to: number, value: number) => {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};

const avatarRect = () => {
  const avatar = document.querySelector<HTMLElement>('.guide-pet-shell .guide-pet-avatar');
  const rect = avatar?.getBoundingClientRect();
  return rect && rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight ? rect : null;
};

/** Where the plane ends up: just beside 星仔, on the side facing the middle of the screen. */
const landingPoint = () => {
  const rect = avatarRect();
  if (!rect) return null;
  const onRight = rect.left + rect.width / 2 > window.innerWidth / 2;
  return {
    x: onRight ? rect.left - rect.width * 0.2 : rect.right + rect.width * 0.2,
    y: rect.top + rect.height * 0.4,
    centre: { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.6 },
  };
};

/**
 * The flight path's waypoints: a climb out of the button, two loops the
 * loop drifting forward a little each turn, then a long glide down to 星仔.
 */
const waypoints = (start: Point, end: Point): Point[] => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dir = end.x >= start.x ? 1 : -1;
  const radius = clamp(Math.min(width, height) * 0.07, 36, 58);
  const advance = radius * 0.7;
  // Climb well above both ends, loop up there, then glide down to 星仔.
  const cy = clamp(Math.min(start.y, end.y) - height * 0.26, radius + 60, height - radius - 60);
  const cx = clamp((start.x + end.x) / 2 - (dir * loops * advance) / 2, radius * 2.6 + 20, width - radius * 2.6 - 20);

  const points: Point[] = [start, { x: start.x + dir * 22, y: start.y - 30 }];
  const steps = 10;
  for (let k = 0; k <= loops * steps; k += 1) {
    const angle = (k / steps) * Math.PI * 2;
    points.push({ x: cx + advance * dir * (k / steps) + dir * radius * Math.sin(angle), y: cy + radius * Math.cos(angle) });
  }
  const exit = points[points.length - 1];
  // A gentle arc down to 星仔, bowed outward.
  const dx = end.x - exit.x;
  const dy = end.y - exit.y;
  points.push({ x: exit.x + dx * 0.5 + dy * 0.18 * dir, y: exit.y + dy * 0.5 - Math.abs(dx) * 0.18 }, end);
  return points;
};

/** A centripetal Catmull-Rom spline through the waypoints, sampled densely, with distances along it. */
const samplePath = (points: Point[]) => {
  const padded = [points[0], ...points, points[points.length - 1]];
  const xs: number[] = [];
  const ys: number[] = [];
  const knot = (a: Point, b: Point) => Math.max(1e-3, Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)));
  for (let i = 1; i < padded.length - 2; i += 1) {
    const [p0, p1, p2, p3] = [padded[i - 1], padded[i], padded[i + 1], padded[i + 2]];
    const t1 = knot(p0, p1);
    const t2 = t1 + knot(p1, p2);
    const t3 = t2 + knot(p2, p3);
    const samples = 16;
    for (let j = 0; j < samples; j += 1) {
      const t = t1 + ((t2 - t1) * j) / samples;
      const lerp = (a: Point, b: Point, ta: number, tb: number) => {
        const u = (t - ta) / (tb - ta);
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      };
      const a1 = lerp(p0, p1, 0, t1);
      const a2 = lerp(p1, p2, t1, t2);
      const a3 = lerp(p2, p3, t2, t3);
      const b1 = lerp(a1, a2, 0, t2);
      const b2 = lerp(a2, a3, t1, t3);
      const c = lerp(b1, b2, t1, t2);
      xs.push(c.x);
      ys.push(c.y);
    }
  }
  const last = points[points.length - 1];
  xs.push(last.x);
  ys.push(last.y);
  const distances = [0];
  for (let i = 1; i < xs.length; i += 1) distances.push(distances[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  return { xs, ys, distances, length: distances[distances.length - 1] };
};

type SampledPath = ReturnType<typeof samplePath>;

const pointAt = (path: SampledPath, distance: number): Point => {
  const s = clamp(distance, 0, path.length);
  let low = 0;
  let high = path.distances.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (path.distances[mid] < s) low = mid;
    else high = mid;
  }
  const span = path.distances[high] - path.distances[low] || 1;
  const u = (s - path.distances[low]) / span;
  return { x: path.xs[low] + (path.xs[high] - path.xs[low]) * u, y: path.ys[low] + (path.ys[high] - path.ys[low]) * u };
};

export const PaperPlane: React.FC = () => {
  const planeRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<Array<SVGPolylineElement | null>>([]);

  useEffect(() => {
    let flight: gsap.core.Timeline | null = null;
    let readTimer = 0;

    const clearTrail = () => trailRefs.current.forEach((line) => line?.setAttribute('points', ''));

    const handleLaunch = (event: WindowEventMap['galaxy-paper-plane']) => {
      const plane = planeRef.current;
      if (!plane) return;
      flight?.kill();
      window.clearTimeout(readTimer);
      clearTrail();

      const catchAndRead = () => {
        petReact('catch');
        readTimer = window.setTimeout(() => petReact('read'), 450);
      };

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (avatarRect()) catchAndRead();
        return;
      }

      const start = event.detail;
      const fallback = { x: window.innerWidth - 60, y: window.innerHeight - 90 };
      const firstLanding = landingPoint() ?? fallback;
      const path = samplePath(waypoints(start, firstLanding));
      // Heading left, the plane is drawn mirrored so its top wing stays on top.
      const mirror = firstLanding.x < start.x ? -1 : 1;

      // 星仔 may wander a little meanwhile, so the last stretch bends toward where they are now.
      let drift = { x: 0, y: 0 };
      const positionAt = (distance: number) => {
        const point = pointAt(path, distance);
        const weight = smoothstep(path.length * 0.7, path.length, distance);
        return { x: point.x + drift.x * weight, y: point.y + drift.y * weight };
      };

      const state = { distance: 0, grow: 0, tail: trailLength, fade: 1 };
      let landed = false;

      const drawTrail = () => {
        const head = state.distance;
        const tail = Math.max(0, head - state.tail);
        const chunk = (head - tail) / trailChunks;
        trailRefs.current.forEach((line, i) => {
          if (!line) return;
          const from = tail + chunk * i;
          if (chunk < 0.5) {
            line.setAttribute('points', '');
            return;
          }
          const points: string[] = [];
          for (let s = from; s < from + chunk; s += 4) {
            const p = positionAt(s);
            points.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
          }
          const p = positionAt(from + chunk);
          points.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
          line.setAttribute('points', points.join(' '));
          // Keep the dashes fixed in place along the path as the trail grows.
          line.style.strokeDashoffset = `${from % trailDash}`;
          line.style.opacity = `${((i + 1) / trailChunks) * 0.55 * state.fade}`;
        });
      };

      const drawPlane = (scale: number, opacity: number) => {
        const p = positionAt(state.distance);
        const ahead = positionAt(state.distance + 3);
        const behind = positionAt(state.distance - 3);
        const angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x);
        const rotate = mirror < 0 ? angle - Math.PI : angle;
        plane.style.opacity = `${opacity}`;
        plane.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) rotate(${rotate}rad) scale(${scale * mirror}, ${scale})`;
      };

      const render = () => {
        const landing = landingPoint();
        if (landing) drift = { x: landing.x - firstLanding.x, y: landing.y - firstLanding.y };
        drawTrail();
        if (!landed) drawPlane(0.3 + 0.7 * state.grow, state.grow);
      };

      const duration = clamp(path.length / 330, 3.2, 5.6);
      flight = gsap.timeline({ onUpdate: render });
      flight
        // It grows slowly out of the icon in the button.
        .to(state, { grow: 1, duration: growTime, ease: 'power2.out' }, 0)
        .to(state, { distance: path.length, duration, ease: 'sine.inOut' }, 0)
        .add(() => {
          landed = true;
          const landing = landingPoint();
          if (!landing) {
            gsap.to(plane, { opacity: 0, duration: 0.4 });
            return;
          }
          catchAndRead();
          // Tuck into 星仔's hands.
          const end = positionAt(path.length);
          const tuck = { x: end.x, y: end.y, scale: 1 };
          gsap.to(tuck, {
            x: landing.centre.x,
            y: landing.centre.y,
            scale: 0.4,
            duration: 0.25,
            ease: 'power2.in',
            onUpdate: () => {
              plane.style.transform = `translate(${tuck.x}px, ${tuck.y}px) translate(-50%, -50%) scale(${tuck.scale * mirror}, ${tuck.scale})`;
            },
          });
          gsap.to(plane, { opacity: 0, duration: 0.15, delay: 0.12 });
        }, duration)
        // The trail draws in behind it and fades.
        .to(state, { tail: 0, fade: 0, duration: 0.8, ease: 'power1.in' }, duration);
    };

    window.addEventListener('galaxy-paper-plane', handleLaunch);
    return () => {
      window.removeEventListener('galaxy-paper-plane', handleLaunch);
      flight?.kill();
      window.clearTimeout(readTimer);
    };
  }, []);

  return (
    <div className="paper-plane-layer" aria-hidden="true">
      <svg className="paper-plane-trail">
        {Array.from({ length: trailChunks }, (_, i) => (
          <polyline
            key={i}
            ref={(line) => {
              trailRefs.current[i] = line;
            }}
          />
        ))}
      </svg>
      <div ref={planeRef} className="paper-plane">
        {/* A line drawing like the ship on the ring: nose to the right, top wing, then the keel below the fold. */}
        <svg viewBox="0 0 44 26">
          <path className="plane-wing" d="M42 12 L3 3 L13 13.5 Z" />
          <path className="plane-keel" d="M42 12 L13 13.5 L10 22 Z" />
          <path className="plane-crease" d="M13 13.5 L7 8" />
        </svg>
      </div>
    </div>
  );
};
