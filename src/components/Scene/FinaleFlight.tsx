import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { themes } from '../../data/themes';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { createSeededRandom } from '../../utils/random';
import { finaleDepth, finaleTrack } from '../../utils/finale';

/*
 * The 3D half of the finale (see utils/finale.ts): the camera pulls straight
 * back along its line of sight, out through a field of galaxies like this
 * one, and flies home the same way. FinaleSequence tweens finaleTrack; this
 * applies it every frame and puts the camera back when the finale ends.
 */

// This galaxy, its planets and the far stars: hidden while they are only a speck far behind.
const homeObjects = ['galaxy-core', 'planets', 'background-stars'];

const fieldVertexShader = `
uniform float uTime;
uniform float uAlpha;
uniform float uScale;
attribute vec3 aColor;
attribute float aSize;
attribute float aSeed;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float depth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  float size = aSize * uScale / max(depth, 0.05);
  gl_PointSize = clamp(size, 1.0, 12.0);
  // Invisible right at the camera and fading out into the distance; dust
  // smaller than a pixel dims instead of shrinking.
  float fade = smoothstep(0.8, 7.0, depth) * (1.0 - smoothstep(170.0, 430.0, depth));
  float twinkle = 0.78 + 0.22 * sin(uTime * (1.2 + aSeed * 2.6) + aSeed * 37.0);
  vAlpha = uAlpha * fade * twinkle * clamp(size, 0.2, 1.0);
  vColor = aColor;
}
`;

const fieldFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  float radius = length(gl_PointCoord - 0.5);
  if (radius > 0.5) discard;
  float glow = exp(-radius * radius * 18.0) * (1.0 - smoothstep(0.32, 0.5, radius));
  gl_FragColor = vec4(vColor * 1.3, glow * vAlpha);
}
`;

const worldUp = new THREE.Vector3(0, 1, 0);
const worldRight = new THREE.Vector3(1, 0, 0);

/**
 * Galaxies like this one (a round core inside a flat ring of three bands,
 * half to nine-tenths its size), spread evenly along the way out. Each sits
 * off to one side of the line of sight, a few right on it so the view flies
 * through them, tilted every which way and tinted with a planet's colour or
 * left grey.
 */
const buildField = (cameraPosition: THREE.Vector3, small: boolean) => {
  const random = createSeededRandom(2026);
  const axis = cameraPosition.clone().normalize();
  const right = new THREE.Vector3().crossVectors(worldUp, axis).normalize();
  const up = new THREE.Vector3().crossVectors(axis, right);
  const start = cameraPosition.length();
  const galaxies = small ? 110 : 190;
  const parts = small ? { core: 90, ring: 150 } : { core: 160, ring: 260 };
  const count = galaxies * (parts.core + parts.ring);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const palette = Object.values(themes).map((theme) => new THREE.Color(theme.color));
  const coreGrey = new THREE.Color('#d4d9e4');
  const ringGrey = new THREE.Color('#8d91a1');
  const centre = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();
  const point = new THREE.Vector3();
  const coreColor = new THREE.Color();
  const ringColor = new THREE.Color();
  const color = new THREE.Color();
  let index = 0;
  const push = (size: number) => {
    point.toArray(positions, index * 3);
    color.toArray(colors, index * 3);
    sizes[index] = size;
    seeds[index] = random();
    index += 1;
  };

  for (let g = 0; g < galaxies; g += 1) {
    const along = start + 30 + ((g + random()) / galaxies) * (finaleDepth - 160);
    const side = random() < 0.12 ? random() * 4 : 7 + Math.pow(random(), 1.3) * 40;
    const angle = random() * Math.PI * 2;
    centre.copy(axis).multiplyScalar(along)
      .addScaledVector(right, Math.cos(angle) * side)
      .addScaledVector(up, Math.sin(angle) * side);
    normal.set(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize();
    tangent.crossVectors(normal, Math.abs(normal.y) < 0.9 ? worldUp : worldRight).normalize();
    bitangent.crossVectors(normal, tangent);
    const scale = 0.5 + random() * 0.4;
    const tint = random() < 0.4 ? null : palette[Math.floor(random() * palette.length)];
    coreColor.copy(coreGrey);
    ringColor.copy(ringGrey);
    if (tint) {
      coreColor.lerp(tint, 0.3);
      ringColor.lerp(tint, 0.7);
    }

    for (let i = 0; i < parts.core; i += 1) {
      // Denser towards the middle, like the centre star.
      const layer = random();
      const radius = (layer < 0.55 ? 1.8 * Math.sqrt(random()) : layer < 0.88 ? 1.8 + random() * 0.4 : 2.2 + random() * 1.5) * scale;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(random() * 2 - 1);
      point.set(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)).multiplyScalar(radius).add(centre);
      color.copy(coreColor).multiplyScalar(0.75 + random() * 0.4);
      push(0.06 + Math.pow(random(), 3) * 0.12);
    }
    for (let i = 0; i < parts.ring; i += 1) {
      // The same three bands as this galaxy's rings.
      const band = random();
      const radius = (band < 0.3 ? 3.5 + random() * 1.5 : band < 0.8 ? 5.2 + random() * 3.5 : 8.8 + random() * 4) * scale;
      const theta = random() * Math.PI * 2;
      point.copy(centre)
        .addScaledVector(tangent, Math.cos(theta) * radius)
        .addScaledVector(bitangent, Math.sin(theta) * radius)
        .addScaledVector(normal, (random() - 0.5) * 0.12 * scale);
      color.copy(ringColor).multiplyScalar(0.7 + random() * 0.45);
      push(0.05 + Math.pow(random(), 3) * 0.1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  return geometry;
};

export const FinaleFlight: React.FC = () => {
  const { camera, scene, size } = useThree();
  const finale = useGalaxyStore((state) => state.finale);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  // Built once, for the screen the site was opened on.
  const [geometry] = useState(() => buildField(camera.position, size.width < 768));
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uAlpha: { value: 0 }, uScale: { value: 1 } }), []);
  // Where the camera sat when the finale started, and the way out from there.
  const run = useRef<{ position: THREE.Vector3; axis: THREE.Vector3 } | null>(null);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    if (finale) {
      finaleTrack.distance = 0;
      finaleTrack.field = 0;
      finaleTrack.home = true;
      run.current = { position: camera.position.clone(), axis: camera.position.clone().normalize() };
      return;
    }
    // Over (or cut short): everything back where it was.
    const last = run.current;
    if (!last) return;
    camera.position.copy(last.position);
    for (const name of homeObjects) {
      const object = scene.getObjectByName(name);
      if (object) object.visible = true;
    }
    if (pointsRef.current) pointsRef.current.visible = false;
    run.current = null;
  }, [camera, finale, scene]);

  useFrame((state, delta) => {
    const current = run.current;
    const points = pointsRef.current;
    const material = materialRef.current;
    if (!current || !points || !material) return;
    const { camera: view } = state;
    view.position.copy(current.position).addScaledVector(current.axis, finaleTrack.distance);
    for (const name of homeObjects) {
      const object = state.scene.getObjectByName(name);
      if (object) object.visible = finaleTrack.home;
    }
    points.visible = finaleTrack.field > 0.001;
    material.uniforms.uAlpha.value = finaleTrack.field;
    material.uniforms.uTime.value += delta;
    const fov = view instanceof THREE.PerspectiveCamera ? view.fov : 45;
    material.uniforms.uScale.value = (state.size.height * 0.5) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} visible={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={fieldVertexShader}
        fragmentShader={fieldFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
