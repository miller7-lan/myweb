import * as THREE from 'three';

/*
 * The ship's wake on the ring, as real water makes it: every point the ship
 * passes sends out a ring of waves that keeps spreading from where it was
 * made, at about a third of the ship's speed. Together they form the V of a
 * boat's wake (about 19.5 degrees each side), and when the ship changes
 * course the V bends along the path it really took. In a turn the outer
 * side is pushed harder, as a heeling boat throws its water outwards.
 *
 * RingShip drops a source every `wakeTrail.every` seconds of ring time and
 * the ring's particles (shaders/particles.ts) rise, part and settle back
 * as the waves pass them. All in ring-local coordinates.
 */
export const wakeSourceCount = 32;

export const wakeTrail = {
  every: 0.2,
  life: 6.2,
  /** x, z, ring time when made, strength (0 = unused). */
  points: Array.from({ length: wakeSourceCount }, () => new THREE.Vector4(0, 0, -999, 0)),
  /** The ship's velocity in xz when it passed, and its turn rate (rad/s, signed like cross(heading, offset) on the inside of the turn). */
  motion: Array.from({ length: wakeSourceCount }, () => new THREE.Vector3()),
  cursor: 0,
  lastAt: -999,
};
