import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGalaxyStore } from '../../store/useGalaxyStore';

type ConstellationTemplate = {
  name: string;
  points: Array<[number, number]>;
  edges: Array<[number, number]>;
};

type FireworkSlot = {
  active: boolean;
  age: number;
  launchedAt: number;
  template: ConstellationTemplate;
  spin: number;
  tint: THREE.Color;
  burst: THREE.Vector3;
  depths: number[];
};

interface ConstellationFireworksProps {
  isMobilePortrait: boolean;
}

const templates: ConstellationTemplate[] = [
  { name: 'aries', points: [[-.7,.45],[-.2,.15],[.15,-.15],[.55,-.55]], edges: [[0,1],[1,2],[2,3]] },
  { name: 'taurus', points: [[-.75,.35],[-.35,.1],[0,0],[.35,.1],[.75,.35],[-.18,-.35],[.28,-.45]], edges: [[0,1],[1,2],[2,3],[3,4],[2,5],[2,6]] },
  { name: 'gemini', points: [[-.45,.55],[-.5,.15],[-.38,-.35],[-.2,-.6],[.45,.5],[.5,.1],[.38,-.35],[.18,-.58]], edges: [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[0,4],[2,6]] },
  { name: 'cancer', points: [[-.2,.65],[-.1,.18],[.25,-.1],[.55,-.5],[-.55,-.35]], edges: [[0,1],[1,2],[2,3],[2,4]] },
  { name: 'leo', points: [[-.8,-.25],[-.35,-.05],[.05,.05],[.35,.38],[.65,.32],[.48,-.08],[.1,-.32]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[2,6]] },
  { name: 'virgo', points: [[-.65,.35],[-.3,.15],[.05,.25],[.35,.02],[.62,.18],[.5,-.28],[.12,-.45],[-.25,-.18]], edges: [[0,1],[1,2],[2,3],[3,4],[3,5],[5,6],[6,7],[7,1]] },
  { name: 'libra', points: [[-.55,.05],[-.15,.45],[.35,.35],[.58,-.1],[.05,-.55]], edges: [[0,1],[1,2],[2,3],[2,4],[4,0]] },
  { name: 'scorpio', points: [[-.78,.25],[-.45,.18],[-.15,.05],[.1,-.12],[.38,-.22],[.62,-.05],[.72,.28],[.5,.52]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]] },
  { name: 'sagittarius', points: [[-.62,-.45],[-.3,-.1],[.02,.2],[.35,.55],[.65,.25],[.25,-.12],[.58,-.48],[-.1,.55]], edges: [[0,1],[1,2],[2,3],[3,4],[2,5],[5,6],[2,7]] },
  { name: 'capricorn', points: [[-.65,-.35],[-.35,.35],[.05,.58],[.48,.18],[.62,-.32],[.05,-.5]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]] },
  { name: 'aquarius', points: [[-.78,.25],[-.5,.42],[-.2,.2],[.05,.35],[.32,.12],[.58,.28],[.75,.05],[-.08,-.32]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[2,7]] },
  { name: 'pisces', points: [[-.62,.45],[-.35,.2],[-.48,-.12],[-.72,-.32],[.42,.48],[.68,.18],[.48,-.18],[.2,-.42]], edges: [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[1,6]] },
];

const maxSlots = 3;
const maxStars = 8;
const maxEdges = 8;
const origin = new THREE.Vector3(0, 0.2, 0);
const tintPalette = ['#eff6ff', '#f5f3ff', '#ffffff', '#e0f2fe', '#ede9fe'];

const easeOutBack = (value: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
};

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);
const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);

const createSlot = (index: number): FireworkSlot => ({
  active: false,
  age: 0,
  launchedAt: -index,
  template: templates[index % templates.length],
  spin: 0,
  tint: new THREE.Color(tintPalette[index % tintPalette.length]),
  burst: new THREE.Vector3(),
  depths: Array.from({ length: maxStars }, () => 0),
});

const starVertexShader = `
attribute float aAlpha;
attribute float aSize;
varying float vAlpha;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * (34.0 / -mvPosition.z);
  vAlpha = aAlpha;
}
`;

const starFragmentShader = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 xy = gl_PointCoord.xy - vec2(0.5);
  float dist = length(xy);
  if (dist > 0.5) discard;
  float core = exp(-dist * dist * 22.0);
  float halo = exp(-dist * dist * 3.2) * 0.72;
  float alpha = (core + halo) * vAlpha;
  vec3 color = mix(uColor * 0.92, vec3(1.0), core * 0.68);
  color += uColor * halo * 0.35;
  gl_FragColor = vec4(color, alpha);
}
`;

const starGlowFragmentShader = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 xy = gl_PointCoord.xy - vec2(0.5);
  float dist = length(xy);
  if (dist > 0.5) discard;
  float glow = exp(-dist * dist * 5.2);
  float rim = exp(-dist * dist * 1.7) * 0.34;
  float alpha = (glow * 0.5 + rim) * vAlpha;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.18), alpha);
}
`;

export const ConstellationFireworks: React.FC<ConstellationFireworksProps> = ({ isMobilePortrait }) => {
  const coreFireworkId = useGalaxyStore((state) => state.coreFireworkId);
  const viewState = useGalaxyStore((state) => state.viewState);
  const visualMode = useGalaxyStore((state) => state.visualMode);
  const pointsRefs = useRef<Array<THREE.Object3D | null>>([]);
  const glowRefs = useRef<Array<THREE.Object3D | null>>([]);
  const lineRefs = useRef<Array<THREE.Object3D | null>>([]);
  const trailRefs = useRef<Array<THREE.Object3D | null>>([]);
  const flashRefs = useRef<Array<THREE.Mesh | null>>([]);
  const slots = useRef<FireworkSlot[]>(Array.from({ length: maxSlots }, (_, index) => createSlot(index)));
  const clock = useRef(0);
  const lastHandledId = useRef(0);
  const lastLaunchAt = useRef(-1);

  const pointGeometries = useMemo(() => Array.from({ length: maxSlots }, () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxStars * 3), 3));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(maxStars), 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(maxStars), 1));
    return geometry;
  }), []);

  const lineGeometries = useMemo(() => Array.from({ length: maxSlots }, () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxEdges * 2 * 3), 3));
    return geometry;
  }), []);

  const trailGeometries = useMemo(() => Array.from({ length: maxSlots }, () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    return geometry;
  }), []);

  const uniforms = useMemo(() => Array.from({ length: maxSlots }, (_, index) => ({
    uColor: { value: new THREE.Color(tintPalette[index % tintPalette.length]) },
  })), []);

  const pointMaterials = useMemo(() => uniforms.map((slotUniforms) => new THREE.ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    uniforms: slotUniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })), [uniforms]);

  const glowMaterials = useMemo(() => uniforms.map((slotUniforms) => new THREE.ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starGlowFragmentShader,
    uniforms: slotUniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })), [uniforms]);

  const lineMaterials = useMemo(() => Array.from({ length: maxSlots }, (_, index) => new THREE.LineBasicMaterial({
    color: tintPalette[index % tintPalette.length],
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })), []);

  const trailMaterials = useMemo(() => Array.from({ length: maxSlots }, (_, index) => new THREE.LineBasicMaterial({
    color: tintPalette[index % tintPalette.length],
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })), []);

  const flashMaterials = useMemo(() => Array.from({ length: maxSlots }, (_, index) => new THREE.MeshBasicMaterial({
    color: tintPalette[index % tintPalette.length],
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  })), []);

  useEffect(() => {
    if (coreFireworkId <= 0 || coreFireworkId === lastHandledId.current) return;
    lastHandledId.current = coreFireworkId;
    if (visualMode === 'silent') return;
    if (viewState !== 'HOME' && viewState !== 'HOVER_PLANET') return;
    if (clock.current - lastLaunchAt.current < 0.45) return;

    lastLaunchAt.current = clock.current;
    const slot = slots.current.find((candidate) => !candidate.active)
      ?? [...slots.current].sort((a, b) => a.launchedAt - b.launchedAt)[0];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const tint = new THREE.Color(tintPalette[Math.floor(Math.random() * tintPalette.length)]);

    slot.active = true;
    slot.age = 0;
    slot.launchedAt = clock.current;
    slot.template = template;
    slot.spin = (Math.random() - 0.5) * 0.38;
    slot.tint.copy(tint);
    slot.burst.set(
      (Math.random() - 0.5) * (isMobilePortrait ? 2.3 : 3.2),
      isMobilePortrait ? 2.18 + Math.random() * 0.5 : 2.75 + Math.random() * 0.95,
      (Math.random() - 0.5) * 0.48
    );
    slot.depths = Array.from({ length: maxStars }, () => (Math.random() - 0.5) * 0.34);
  }, [coreFireworkId, isMobilePortrait, viewState, visualMode]);

  useFrame((_, delta) => {
    clock.current += delta;
    const globalScale = isMobilePortrait ? 1.46 : 2.18;
    const opacityScale = visualMode === 'focus' ? 0.58 : visualMode === 'silent' ? 0 : 1;

    slots.current.forEach((slot, index) => {
      const points = pointsRefs.current[index];
      const glow = glowRefs.current[index];
      const lines = lineRefs.current[index];
      const trail = trailRefs.current[index];
      const flash = flashRefs.current[index];
      const pointGeometry = pointGeometries[index];
      const lineGeometry = lineGeometries[index];
      const trailGeometry = trailGeometries[index];
      const lineMaterial = lineMaterials[index];
      const trailMaterial = trailMaterials[index];
      const flashMaterial = flashMaterials[index];
      uniforms[index].uColor.value.copy(slot.tint);
      lineMaterial.color.copy(slot.tint);
      trailMaterial.color.copy(slot.tint);
      flashMaterial.color.copy(slot.tint);

      if (!slot.active || opacityScale <= 0) {
        if (points) points.visible = false;
        if (glow) glow.visible = false;
        if (lines) lines.visible = false;
        if (trail) trail.visible = false;
        if (flash) flash.visible = false;
        return;
      }

      slot.age += delta;
      const launchDuration = 0.54;
      const burstAge = Math.max(0, slot.age - launchDuration);
      const launchProgress = clamp01(slot.age / launchDuration);
      const spreadProgress = clamp01(burstAge / 0.62);
      const lineProgress = clamp01((burstAge - 0.18) / 0.44);
      const fadeOut = 1 - clamp01((burstAge - 1.18) / 0.62);
      const alpha = fadeOut * opacityScale;
      const spread = easeOutBack(spreadProgress);
      const lineAlpha = easeOutCubic(lineProgress) * alpha * 0.92;
      const launchHead = origin.clone().lerp(slot.burst, easeOutCubic(launchProgress));
      const positions = pointGeometry.getAttribute('position') as THREE.BufferAttribute;
      const alphas = pointGeometry.getAttribute('aAlpha') as THREE.BufferAttribute;
      const sizes = pointGeometry.getAttribute('aSize') as THREE.BufferAttribute;
      const linePositions = lineGeometry.getAttribute('position') as THREE.BufferAttribute;
      const trailPositions = trailGeometry.getAttribute('position') as THREE.BufferAttribute;
      const livePositions: THREE.Vector3[] = [];

      if (slot.age < launchDuration) {
        for (let starIndex = 0; starIndex < maxStars; starIndex += 1) {
          const offset = starIndex === 0 ? 0 : (starIndex - 1) * 0.018;
          positions.setXYZ(starIndex, launchHead.x, launchHead.y - offset, launchHead.z);
          alphas.setX(starIndex, starIndex < 3 ? opacityScale * (1.18 - starIndex * 0.24) : 0);
          sizes.setX(starIndex, starIndex === 0 ? 12.5 : 7.4);
        }

        const tailStart = origin.clone().lerp(launchHead, clamp01(launchProgress - 0.32));
        trailPositions.setXYZ(0, tailStart.x, tailStart.y, tailStart.z);
        trailPositions.setXYZ(1, launchHead.x, launchHead.y, launchHead.z);
        positions.needsUpdate = true;
        alphas.needsUpdate = true;
        sizes.needsUpdate = true;
        trailPositions.needsUpdate = true;
        lineMaterial.opacity = 0;
        trailMaterial.opacity = Math.sin(launchProgress * Math.PI) * 1.0 * opacityScale;

        if (points) points.visible = true;
        if (glow) glow.visible = true;
        if (lines) lines.visible = false;
        if (trail) trail.visible = trailMaterial.opacity > 0.02;
        if (flash) flash.visible = false;
        return;
      }

      for (let starIndex = 0; starIndex < maxStars; starIndex += 1) {
        const point = slot.template.points[starIndex];
        const visible = Boolean(point);
        const jitter = Math.sin(clock.current * (7.2 + starIndex * 0.47) + starIndex) * 0.055;
        const twinkle = 0.76 + Math.sin(clock.current * (8.4 + starIndex * 0.35) + starIndex * 1.9) * 0.24;
        const x = visible ? (point[0] * globalScale * spread) : 0;
        const y = visible ? (point[1] * globalScale * spread) : 0;
        const z = visible ? slot.depths[starIndex] * spread : 0;
        const rotatedX = x * Math.cos(slot.spin) - y * Math.sin(slot.spin);
        const rotatedY = x * Math.sin(slot.spin) + y * Math.cos(slot.spin);
        const world = new THREE.Vector3(slot.burst.x + rotatedX, slot.burst.y + rotatedY, slot.burst.z + z + jitter * spread);
        livePositions[starIndex] = world;

        positions.setXYZ(starIndex, world.x, world.y, world.z);
        alphas.setX(starIndex, visible ? alpha * Math.min(1.22, twinkle + 0.18) : 0);
        sizes.setX(starIndex, visible ? (14.4 + starIndex % 3) * (0.82 + spreadProgress * 0.62) : 0);
      }

      let lineCursor = 0;
      for (let edgeIndex = 0; edgeIndex < maxEdges; edgeIndex += 1) {
        const edge = slot.template.edges[edgeIndex];
        const from = edge ? livePositions[edge[0]] : slot.burst;
        const to = edge ? livePositions[edge[1]] : slot.burst;
        linePositions.setXYZ(lineCursor, from.x, from.y, from.z);
        linePositions.setXYZ(lineCursor + 1, to.x, to.y, to.z);
        lineCursor += 2;
      }

      trailPositions.setXYZ(0, slot.burst.x, slot.burst.y, slot.burst.z);
      trailPositions.setXYZ(1, slot.burst.x, slot.burst.y, slot.burst.z);
      positions.needsUpdate = true;
      alphas.needsUpdate = true;
      sizes.needsUpdate = true;
      linePositions.needsUpdate = true;
      trailPositions.needsUpdate = true;
      lineMaterial.opacity = lineAlpha;
      trailMaterial.opacity = 0;

      if (points) points.visible = alpha > 0.02;
      if (glow) glow.visible = alpha > 0.02;
      if (lines) lines.visible = lineAlpha > 0.02;
      if (trail) trail.visible = false;
      if (flash) {
        const flashProgress = clamp01(burstAge / 0.44);
        flash.visible = alpha > 0.02 && flashProgress < 1;
        flash.position.copy(slot.burst);
        flash.scale.setScalar(0.36 + flashProgress * 4.2);
        flashMaterial.opacity = (1 - flashProgress) * 0.66 * opacityScale;
      }

      if (slot.age > 2.58) {
        slot.active = false;
        if (points) points.visible = false;
        if (glow) glow.visible = false;
        if (lines) lines.visible = false;
        if (trail) trail.visible = false;
        if (flash) flash.visible = false;
      }
    });
  });

  return (
    <group>
      {pointGeometries.map((pointGeometry, index) => (
        <React.Fragment key={index}>
          <points
            ref={(element) => { glowRefs.current[index] = element; }}
            geometry={pointGeometry}
            material={glowMaterials[index]}
            visible={false}
            renderOrder={79}
          />
          <points
            ref={(element) => { pointsRefs.current[index] = element; }}
            geometry={pointGeometry}
            material={pointMaterials[index]}
            visible={false}
            renderOrder={83}
          />
          <lineSegments
            ref={(element) => { lineRefs.current[index] = element; }}
            geometry={lineGeometries[index]}
            material={lineMaterials[index]}
            visible={false}
            renderOrder={81}
          />
          <lineSegments
            ref={(element) => { trailRefs.current[index] = element; }}
            geometry={trailGeometries[index]}
            material={trailMaterials[index]}
            visible={false}
            renderOrder={82}
          />
          <mesh
            ref={(element) => { flashRefs.current[index] = element; }}
            visible={false}
            rotation-x={-Math.PI / 2}
            renderOrder={79}
          >
            <ringGeometry args={[0.1, 0.14, 44]} />
            <primitive object={flashMaterials[index]} attach="material" />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};
