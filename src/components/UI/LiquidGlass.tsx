import { useEffect, useRef } from 'react';
import { glassSurfaceSelector } from '../../utils/glassSurfaces';
import { useLiquidMotion } from '../../utils/liquidMotion';

/*
 * Liquid glass, after the open-source recreations of Apple's material
 * (rdev/liquid-glass-react, shuding/liquid-glass, kube.io's write-up):
 *
 * 1. Every glass surface gets a `.glass-rim` span: a 1.5px ring, masked out of a
 *    diagonal gradient, so light catches two opposite corners and fades along
 *    the sides. Works in every browser.
 * 2. In Chromium (desktop), each surface also gets its own SVG filter used as
 *    `backdrop-filter: url(#…)`. A displacement map bends the backdrop only in a
 *    thin bezel around the edge, like the rounded edge of a lens, and leaves the
 *    middle undistorted. Safari and Firefox do not render url() backdrop
 *    filters, so they keep the plain blur.
 */


const SVG_NS = 'http://www.w3.org/2000/svg';
const MAGNIFY = 1.18; // the whole backdrop behind the glass is enlarged this much
const MAX_PULL = 42; // px; wide panels get a gentler zoom so their far edges never drift more than this
const LENS_BAND = 64; // px from the edge inward where the rim bends extra
const EDGE_ZOOM = 0.7; // extra slope of the shift at the very edge

/* Surfaces with busy content passing beneath them (scrolling text, the live
   starfield) get the three-pass colour dispersion. Cards inside a theme page
   sit on the dark, heavily blurred backdrop where the fringes cannot be seen,
   so they use one displacement pass: about a third of the filter cost. */
const dispersionSelector = ".theme-bar, .theme-switcher, .guide-pet-panel, .home-interface .hud-panel, .announcement-card, [data-guide-id='project-detail'], .release-preview-card";

const scrollingCardSelector = ".theme-shell .theme-scroll :is(.hud-panel, .scan-card):not(.release-preview-card, [data-guide-id='project-detail'])";

const supportsRefraction = () => {
  const ua = navigator.userAgent;
  const chromium = /Chrome\/|Chromium\/|Edg\//.test(ua) && !/CriOS|FxiOS|Firefox/.test(ua);
  return chromium && window.matchMedia('(pointer: fine)').matches;
};

// R/G encode how far (and which way) the backdrop is sampled, 128 = no shift.
// The map is symmetric, so one quadrant is computed and mirrored into the
// other three, and the rim normal comes straight from the rounded-rect
// geometry instead of sampling the distance field around every pixel.
const createDisplacementMap = (width: number, height: number, radius: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const image = context.createImageData(width, height);
  const data = image.data;
  const halfW = width / 2;
  const halfH = height / 2;
  const r = Math.min(radius, halfW, halfH);
  // Small controls get a band that fits inside them.
  const band = Math.max(4, Math.min(LENS_BAND, Math.min(halfW, halfH) * 0.9));
  // 1. A uniform zoom: sample toward the centre in proportion to the distance
  //    from it. Linear, so the enlargement is the same from edge to centre.
  const pull = Math.min(1 - 1 / MAGNIFY, MAX_PULL / Math.max(halfW, halfH));
  // 2. The rim: f(u) = rimShift * u², u = 0 at the band's inner edge and 1 at
  //    the glass edge, so the bending is strongest right at the edge.
  const rimShift = (EDGE_ZOOM * band) / 2;
  const shift = Math.max(halfW, halfH) * pull + rimShift;
  const encode = 127 / shift;

  const write = (px: number, py: number, dx: number, dy: number) => {
    const index = (py * width + px) * 4;
    data[index] = 128 + dx * encode;
    data[index + 1] = 128 + dy * encode;
    data[index + 2] = 128;
    data[index + 3] = 255;
  };

  for (let py = 0; py < Math.ceil(height / 2); py += 1) {
    const y = py + 0.5 - halfH; // <= 0 in this quadrant
    const ay = -y;
    const qy = ay - halfH + r;
    const sy = y < 0 ? 1 : 0; // the mirrored row flips the sign
    for (let px = 0; px < Math.ceil(width / 2); px += 1) {
      const x = px + 0.5 - halfW;
      const ax = -x;
      const qx = ax - halfW + r;
      // Distance to the edge (0 on it, growing inward) and the outward
      // normal, both in the positive quadrant.
      let depth: number;
      let nx: number;
      let ny: number;
      if (qx > 0 && qy > 0) {
        const corner = Math.hypot(qx, qy);
        depth = r - corner;
        nx = qx / corner;
        ny = qy / corner;
      } else {
        depth = r - Math.max(qx, qy);
        // Straight sides; blend across the 45° seam where they meet.
        const t = Math.max(0, Math.min(1, (qx - qy + 1) / 2));
        const length = Math.hypot(t, 1 - t);
        nx = t / length;
        ny = (1 - t) / length;
      }

      let dx = -ax * pull;
      let dy = -ay * pull;
      if (depth < band) {
        // Sample inward: what sits under the rim is enlarged toward the edge.
        const u = 1 - Math.max(depth, 0) / band;
        const strength = rimShift * u * u;
        dx -= nx * strength;
        dy -= ny * strength;
      }

      // Back from the positive quadrant to this pixel and its mirrors.
      const sx = x < 0 ? 1 : 0;
      const mx = width - 1 - px;
      const my = height - 1 - py;
      write(px, py, -dx * sx, -dy * sy);
      write(mx, py, dx * sx, -dy * sy);
      write(px, my, -dx * sx, dy * sy);
      write(mx, my, dx * sx, dy * sy);
    }
  }

  context.putImageData(image, 0, 0);
  return { url: canvas.toDataURL(), shift };
};

const ensureRim = (surface: HTMLElement) => {
  if (surface.querySelector(':scope > .glass-rim')) return;
  const rim = document.createElement('span');
  rim.className = 'glass-rim';
  rim.setAttribute('aria-hidden', 'true');
  surface.append(rim);
};

export function LiquidGlass() {
  const defsRef = useRef<SVGDefsElement>(null);
  useLiquidMotion();

  useEffect(() => {
    const defs = defsRef.current;
    const refraction = supportsRefraction();
    // A per-mount prefix: after a hot reload the old filters can linger in the
    // page, and a reused id would point surfaces at a stale, wrong-sized map.
    const idPrefix = `liquid-glass-${Math.random().toString(36).slice(2, 7)}`;
    const touched = new Set<HTMLElement>();
    const filters = new Map<string, string>();
    const surfaceKeys = new WeakMap<HTMLElement, string>();
    const observed = new WeakSet<HTMLElement>();

    const filterFor = (width: number, height: number, radius: number, dispersion: boolean) => {
      const key = `${width}x${height}r${radius}${dispersion ? 'd' : ''}`;
      const existing = filters.get(key);
      if (existing) return existing;
      const map = createDisplacementMap(width, height, radius);
      if (!map || !defs) return null;

      const id = `${idPrefix}-${filters.size}`;
      const filter = document.createElementNS(SVG_NS, 'filter');
      filter.setAttribute('id', id);
      filter.setAttribute('filterUnits', 'userSpaceOnUse');
      filter.setAttribute('color-interpolation-filters', 'sRGB');
      filter.setAttribute('x', '0');
      filter.setAttribute('y', '0');
      filter.setAttribute('width', String(width));
      filter.setAttribute('height', String(height));

      const image = document.createElementNS(SVG_NS, 'feImage');
      image.setAttribute('href', map.url);
      image.setAttribute('x', '0');
      image.setAttribute('y', '0');
      image.setAttribute('width', String(width));
      image.setAttribute('height', String(height));
      image.setAttribute('preserveAspectRatio', 'none');
      image.setAttribute('result', 'map');

      // Chromatic dispersion: red, green and blue bend by slightly different
      // amounts, so the strongly bent rim picks up thin colour fringes.
      // scale * (channel/255 - 0.5) == the px shift encoded in the map.
      const baseScale = map.shift * (255 / 127);
      const channel = (scale: number, keep: string, result: string) => {
        const displace = document.createElementNS(SVG_NS, 'feDisplacementMap');
        displace.setAttribute('in', 'SourceGraphic');
        displace.setAttribute('in2', 'map');
        displace.setAttribute('scale', String(scale));
        displace.setAttribute('xChannelSelector', 'R');
        displace.setAttribute('yChannelSelector', 'G');
        displace.setAttribute('result', `${result}-raw`);
        const isolate = document.createElementNS(SVG_NS, 'feColorMatrix');
        isolate.setAttribute('in', `${result}-raw`);
        isolate.setAttribute('type', 'matrix');
        isolate.setAttribute('values', keep);
        isolate.setAttribute('result', result);
        return [displace, isolate];
      };
      const add = (a: string, b: string, result: string) => {
        const sum = document.createElementNS(SVG_NS, 'feComposite');
        sum.setAttribute('in', a);
        sum.setAttribute('in2', b);
        sum.setAttribute('operator', 'arithmetic');
        sum.setAttribute('k2', '1');
        sum.setAttribute('k3', '1');
        sum.setAttribute('result', result);
        return sum;
      };

      if (!dispersion) {
        const [displace] = channel(baseScale, '', 'single');
        displace.removeAttribute('result');
        filter.append(image, displace);
        defs.append(filter);
        filters.set(key, id);
        return id;
      }

      filter.append(
        image,
        ...channel(baseScale * 0.96, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', 'red'),
        ...channel(baseScale, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 'green'),
        ...channel(baseScale * 1.05, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', 'blue'),
        add('red', 'green', 'red-green'),
        add('red-green', 'blue', 'dispersed'),
      );
      defs.append(filter);
      filters.set(key, id);
      return id;
    };

    const updateRefraction = (surface: HTMLElement) => {
      // Layout size, so open/close scale animations don't rebuild maps.
      const w = surface.offsetWidth;
      const h = surface.offsetHeight;
      if (w < 24 || h < 24) return;
      // Glass inside glass and cards that scroll with a theme page have no
      // backdrop filter (see globals.css).
      if (surface.parentElement?.closest(glassSurfaceSelector) || surface.matches(scrollingCardSelector)) return;
      const radius = Math.round(parseFloat(getComputedStyle(surface).borderTopLeftRadius) || 0);
      const dispersion = surface.matches(dispersionSelector);
      const key = `${w}x${h}r${radius}${dispersion ? 'd' : ''}`;
      if (surfaceKeys.get(surface) === key) return;
      const id = filterFor(w, h, radius, dispersion);
      if (!id) return;
      surfaceKeys.set(surface, key);
      touched.add(surface);
      surface.style.setProperty('--glass-refract', `url(#${id})`);
    };

    const resizeObserver = refraction
      ? new ResizeObserver((entries) => entries.forEach((entry) => updateRefraction(entry.target as HTMLElement)))
      : null;

    const scan = () => {
      document.querySelectorAll<HTMLElement>(glassSurfaceSelector).forEach((surface) => {
        ensureRim(surface);
        if (resizeObserver && !observed.has(surface)) {
          observed.add(surface);
          resizeObserver.observe(surface);
        }
      });
    };

    let frame = 0;
    const mutationObserver = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        scan();
      });
    });

    if (refraction) document.documentElement.dataset.glassRefraction = 'on';
    scan();
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      touched.forEach((surface) => surface.style.removeProperty('--glass-refract'));
      defs?.replaceChildren();
      delete document.documentElement.dataset.glassRefraction;
    };
  }, []);

  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
      <defs ref={defsRef} />
    </svg>
  );
}
