import { useEffect, useRef, useState } from 'react';
import { graphLinks, type GraphPoint } from './skillGraphLayout';

type Body = GraphPoint & { vx: number; vy: number };
type Simulation = {
  bodies: Map<string, Body>;
  drag: { id: string; target: GraphPoint } | null;
  wake: () => void;
};

export function useSkillGraphPhysics(base: Map<string, GraphPoint>, worldWidth: number) {
  const [positions, setPositions] = useState(base);
  const simulation = useRef<Simulation | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bodies = new Map([...base].map(([id, point]) => [id, { ...point, vx: 0, vy: 0 }]));
    const springs = graphLinks.map((link) => {
      const a = base.get(link.source)!, b = base.get(link.target)!;
      return { ...link, length: Math.hypot(a.x - b.x, a.y - b.y) };
    });
    let frame = 0, lastTime = 0, quietFrames = 0, disposed = false;
    const engine: Simulation = { bodies, drag: null, wake };
    simulation.current = engine;

    function publish() {
      setPositions(new Map([...bodies].map(([id, point]) => [id, { x: point.x, y: point.y }])));
    }

    function tick(time: number) {
      frame = 0;
      if (disposed) return;
      const dt = lastTime ? Math.min(2, Math.max(0.5, (time - lastTime) / 16.67)) : 1;
      lastTime = time;
      const nodes = [...bodies.values()];
      // Hooke's law passes a dragged node's displacement through its neighbors.
      springs.forEach((spring) => {
        const a = bodies.get(spring.source)!, b = bodies.get(spring.target)!;
        const dx = b.x - a.x, dy = b.y - a.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const force = (distance - spring.length) * (spring.shared ? 0.009 : 0.023) * dt;
        const fx = dx / distance * force, fy = dy / distance * force;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          if (distance > 55) continue;
          const force = (55 - distance) * 0.018 * dt;
          const fx = dx / distance * force, fy = dy / distance * force;
          a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
        }
      }
      let energy = 0;
      bodies.forEach((body, id) => {
        if (engine.drag?.id === id) {
          const dx = engine.drag.target.x - body.x, dy = engine.drag.target.y - body.y;
          // Save a bounded release velocity; holding still naturally dissipates it.
          body.vx = Math.max(-12, Math.min(12, body.vx * 0.35 + dx * 0.45));
          body.vy = Math.max(-12, Math.min(12, body.vy * 0.35 + dy * 0.45));
          body.x = engine.drag.target.x; body.y = engine.drag.target.y;
          return;
        }
        const origin = base.get(id)!;
        // A soft anchor keeps the graph readable while allowing elastic motion.
        body.vx += (origin.x - body.x) * 0.002 * dt;
        body.vy += (origin.y - body.y) * 0.002 * dt;
        const limitX = worldWidth / 2 - 85;
        if (Math.abs(body.x) > limitX) body.vx -= Math.sign(body.x) * (Math.abs(body.x) - limitX) * 0.035 * dt;
        if (Math.abs(body.y) > 305) body.vy -= Math.sign(body.y) * (Math.abs(body.y) - 305) * 0.035 * dt;
        const damping = Math.pow(reducedMotion ? 0.65 : 0.85, dt);
        body.vx = Math.max(-18, Math.min(18, body.vx * damping));
        body.vy = Math.max(-18, Math.min(18, body.vy * damping));
        body.x += body.vx * dt; body.y += body.vy * dt;
        energy += body.vx * body.vx + body.vy * body.vy;
      });
      publish();
      quietFrames = !engine.drag && energy / bodies.size < 0.002 ? quietFrames + 1 : 0;
      if (quietFrames < 12) frame = requestAnimationFrame(tick);
      else lastTime = 0;
    }

    function wake() {
      if (disposed) return;
      quietFrames = 0;
      if (!frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
    }
    wake();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      if (simulation.current === engine) simulation.current = null;
    };
  }, [base, worldWidth]);

  const beginDrag = (id: string) => {
    const engine = simulation.current, point = engine?.bodies.get(id);
    if (!engine || !point) return;
    engine.drag = { id, target: { x: point.x, y: point.y } };
    engine.wake();
  };
  const moveDrag = (dx: number, dy: number) => {
    const engine = simulation.current;
    if (!engine?.drag) return;
    engine.drag.target.x += dx; engine.drag.target.y += dy;
    engine.wake();
  };
  const endDrag = () => {
    const engine = simulation.current;
    if (!engine?.drag) return;
    engine.drag = null;
    engine.wake();
  };
  const reset = () => {
    const engine = simulation.current;
    if (!engine) return;
    engine.drag = null;
    engine.bodies.forEach((body, id) => {
      const point = base.get(id)!;
      body.x = point.x; body.y = point.y; body.vx = 0; body.vy = 0;
    });
    engine.wake();
  };
  return { positions, beginDrag, moveDrag, endDrag, reset };
}
