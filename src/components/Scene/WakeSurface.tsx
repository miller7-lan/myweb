import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { wakeGLSL } from '../../shaders/particles';
import { wakeTrail } from '../../utils/wakeTrail';

/*
 * The ring's particles are too far apart to show the ship's ripples, so a
 * square of "water" follows the ship and draws them faintly in finer dust:
 * a grid of grains fixed to the ring that only shows where a ripple's crest
 * passes. Same ripples as the ring's particles (wakeGLSL), in the ring's
 * own space.
 */
const size = 12;

const vertexShader = `
uniform vec3 uCentre;
varying vec2 vRing;
void main() {
  vRing = position.xz + uCentre.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
${wakeGLSL}
uniform vec3 uColor;
uniform float uOpacity;
uniform vec3 uCentre;
varying vec2 vRing;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // Fade out towards the square's edge.
  vec2 local = (vRing - uCentre.xz) / ${(size / 2).toFixed(1)};
  float edge = 1.0 - smoothstep(0.7, 1.0, length(local));
  if (edge <= 0.0) discard;
  float crest = max(wakeAt(vRing), 0.0);
  if (crest < 0.02) discard;
  // Grains, jittered in a grid fixed to the ring.
  vec2 cell = vRing * 11.0;
  vec2 id = floor(cell);
  vec2 jitter = vec2(hash(id), hash(id + 17.0)) - 0.5;
  float grain = 1.0 - smoothstep(0.1, 0.24, length(fract(cell) - 0.5 - jitter * 0.55));
  float sparkle = 0.55 + 0.45 * hash(id + 3.0);
  float light = pow(crest, 1.3) * (grain * sparkle * 0.9 + 0.08);
  gl_FragColor = vec4(uColor * light, 1.0) * edge * uOpacity;
}
`;

export const WakeSurface: React.FC<{
  shipPositionRef: React.RefObject<THREE.Vector3>;
  timeRef: React.RefObject<number>;
  opacity: number;
}> = ({ shipPositionRef, timeRef, opacity }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), []);
  const uniforms = useMemo(() => ({
    uWakePoints: { value: wakeTrail.points },
    uWakeMotion: { value: wakeTrail.motion },
    uWakeLife: { value: wakeTrail.life },
    uTime: { value: 0 },
    uCentre: { value: new THREE.Vector3() },
    uColor: { value: new THREE.Color('#d4e2f5') },
    uOpacity: { value: 1 },
  }), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const material = mesh.material as THREE.ShaderMaterial;
    const ship = shipPositionRef.current;
    // Stays a little behind the ship, where the wake is.
    mesh.position.set(ship.x, 0.03, ship.z);
    material.uniforms.uCentre.value.copy(mesh.position);
    material.uniforms.uTime.value = timeRef.current;
    material.uniforms.uOpacity.value = opacity;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
