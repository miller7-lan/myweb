import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { tetherTrack } from '../../utils/portal';

/*
 * The wormhole's opening, drawn over the canvas: a dashed line of the
 * theme's colour from the centre star to the clicked planet (ThemePlanet
 * reels the planet in along it, see tetherTrack in utils/portal.ts), and the
 * ring that spreads out from the centre star when the planet sinks in.
 */
export const CoreTether: React.FC = () => {
  const lineRef = useRef<SVGLineElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const ringRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const line = lineRef.current;
    const svg = svgRef.current;
    if (!line || !svg) return;
    let flow = 0;
    let shown = false;

    const draw = (_time: number, deltaMs: number) => {
      const t = tetherTrack;
      if (!t.active) {
        if (shown) {
          svg.style.opacity = '0';
          shown = false;
        }
        return;
      }
      const dx = t.x2 - t.x1;
      const dy = t.y2 - t.y1;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      // From the star's edge to the planet's edge, as far as the line has shot out.
      const startGap = Math.min(t.r1 * 0.9, length * 0.4);
      const endGap = Math.min(t.r2 * 0.9, length * 0.4);
      const span = Math.max(0, length - startGap - endGap) * t.reach;
      line.setAttribute('x1', `${t.x1 + ux * startGap}`);
      line.setAttribute('y1', `${t.y1 + uy * startGap}`);
      line.setAttribute('x2', `${t.x1 + ux * (startGap + span)}`);
      line.setAttribute('y2', `${t.y1 + uy * (startGap + span)}`);
      // Pulled taut: the dashes close up, run toward the star faster and glow brighter.
      flow += (deltaMs / 1000) * (24 + t.tension * 110);
      line.style.strokeDashoffset = `${flow}`;
      line.style.strokeDasharray = `${6 + t.tension * 3} ${8 - t.tension * 4}`;
      line.style.strokeWidth = `${1.4 + t.tension * 0.8}`;
      line.style.stroke = t.color;
      svg.style.setProperty('--tether-glow', `${4 + t.tension * 6}px`);
      svg.style.setProperty('--tether-color', t.color);
      if (!shown) {
        svg.style.opacity = '1';
        shown = true;
      }
    };
    gsap.ticker.add(draw);

    const ripple = (event: WindowEventMap['galaxy-core-ripple']) => {
      const { x, y, r, color } = event.detail;
      const size = Math.max(r * 2, 24);
      ringRefs.current.forEach((ring, i) => {
        if (!ring) return;
        gsap.killTweensOf(ring);
        gsap.set(ring, { left: x - size / 2, top: y - size / 2, width: size, height: size, '--ripple-color': color, scale: 0.8, autoAlpha: 0.9 });
        gsap.to(ring, { scale: i === 0 ? 3.6 : 2.6, autoAlpha: 0, duration: 1.0, delay: i * 0.14, ease: 'power2.out' });
      });
    };
    window.addEventListener('galaxy-core-ripple', ripple);
    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener('galaxy-core-ripple', ripple);
    };
  }, []);

  return (
    <div className="core-tether-layer" aria-hidden="true">
      <svg ref={svgRef} className="core-tether">
        <line ref={lineRef} />
      </svg>
      {[0, 1].map((i) => (
        <span
          key={i}
          className="core-ripple"
          ref={(ring) => {
            ringRefs.current[i] = ring;
          }}
        />
      ))}
    </div>
  );
};
