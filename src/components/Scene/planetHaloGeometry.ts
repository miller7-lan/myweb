import { ConeGeometry, TorusGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function createPlanetHaloGeometry(radius: number, tube: number) {
  const dashCount = 28;
  const period = Math.PI * 2 / dashCount;
  const parts = Array.from({ length: dashCount }, (_, index) => {
    const dash = new TorusGeometry(radius, tube, 8, 5, period * 0.6);
    dash.rotateZ((index + 0.2) * period);
    return dash;
  });
  // At the ring's +X point, +Y is the tangent in its rotation direction.
  const arrow = new ConeGeometry(tube * 3.2, tube * 10, 8);
  arrow.translate(radius, 0, 0);
  const geometry = mergeGeometries([...parts, arrow]);
  parts.forEach((part) => part.dispose());
  arrow.dispose();
  geometry.computeBoundingSphere();
  return geometry;
}
