/* eslint-disable react-hooks/immutability */
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { createSeededRandom } from '../../utils/random';

export type RingImpactEvent = {
  id: number;
  point: THREE.Vector3;
  strength: number;
};

export type ManualMeteorEvent = {
  id: number;
  target: THREE.Vector3;
};

interface MeteorImpactProps {
  impactQueueRef: React.MutableRefObject<RingImpactEvent[]>;
  manualMeteorQueueRef: React.MutableRefObject<ManualMeteorEvent[]>;
  protectedPositionRef: React.MutableRefObject<THREE.Vector3>;
}

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);
const meteorParticleCount = 320;
const maxMeteorSlots = 3;
const shipSafeDistance = 1.55;
const worldUp = new THREE.Vector3(0, 1, 0);
const worldRight = new THREE.Vector3(1, 0, 0);

const meteorVertexShader = `
uniform vec3 uHead;
uniform vec3 uTarget;
uniform vec3 uDirection;
uniform vec3 uSideA;
uniform vec3 uSideB;
uniform float uProgress;
uniform float uTime;
uniform float uOpacity;
uniform float uSizeScale;
uniform float uTrailScale;
uniform float uBeamScale;

attribute float aTrail;
attribute float aAngle;
attribute float aSpread;
attribute float aSize;
attribute float aAlpha;
attribute float aFlicker;

varying float vAlpha;

void main() {
  float gather = pow(uProgress, 1.85);
  float headWeight = 1.0 - aTrail;
  float trailLength = mix(4.7, 3.0, gather) * uTrailScale;
  float beamWidth = mix(0.34, 0.11, gather) * uBeamScale;
  float taper = mix(0.28, 1.0, aTrail);
  float shimmer = sin(uTime * (7.0 + aFlicker * 8.0) + aAngle) * 0.5 + 0.5;

  vec3 pos = uHead - uDirection * aTrail * trailLength;
  pos = mix(pos, uTarget, gather * headWeight * 0.58);

  float spread = beamWidth * aSpread * taper * (0.78 + shimmer * 0.18);
  pos += uSideA * cos(aAngle + uTime * 0.18) * spread;
  pos += uSideB * sin(aAngle + uTime * 0.14) * spread * 0.58;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * uSizeScale * mix(1.65, 0.82, aTrail) * (30.0 / -mvPosition.z) * (1.0 + shimmer * 0.18);

  float flightFade = sin(clamp(uProgress, 0.0, 1.0) * 3.14159265);
  float tailFade = smoothstep(1.0, 0.1, aTrail);
  float headGlow = smoothstep(0.72, 0.0, aTrail);
  vAlpha = uOpacity * flightFade * aAlpha * (tailFade * 0.52 + headGlow * 0.62);
}
`;

const meteorFragmentShader = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 xy = gl_PointCoord.xy - vec2(0.5);
  float dist = length(xy);
  if (dist > 0.5) discard;
  float core = exp(-dist * dist * 20.0);
  float halo = exp(-dist * dist * 5.0) * 0.42;
  float alpha = (core + halo) * vAlpha;
  vec3 color = mix(uColor * 0.62, vec3(1.0), core * 0.45);
  gl_FragColor = vec4(color, alpha);
}
`;

type MeteorPhase = 'idle' | 'flying' | 'flash';

type MeteorSlot = {
  phase: MeteorPhase;
  phaseTime: number;
  flightDuration: number;
  target: THREE.Vector3;
  start: THREE.Vector3;
  head: THREE.Vector3;
  direction: THREE.Vector3;
  sideA: THREE.Vector3;
  sideB: THREE.Vector3;
};

const createMeteorSlot = (): MeteorSlot => ({
  phase: 'idle',
  phaseTime: 0,
  flightDuration: 0.95,
  target: new THREE.Vector3(6.5, 0, 0),
  start: new THREE.Vector3(0, 0, 0),
  head: new THREE.Vector3(0, 0, 0),
  direction: new THREE.Vector3(1, 0, 0),
  sideA: new THREE.Vector3(0, 1, 0),
  sideB: new THREE.Vector3(0, 0, 1),
});

const createMeteorUniforms = () => ({
  uHead: { value: new THREE.Vector3() },
  uTarget: { value: new THREE.Vector3() },
  uDirection: { value: new THREE.Vector3(1, 0, 0) },
  uSideA: { value: new THREE.Vector3(0, 1, 0) },
  uSideB: { value: new THREE.Vector3(0, 0, 1) },
  uProgress: { value: 0 },
  uTime: { value: 0 },
  uOpacity: { value: 0 },
  uSizeScale: { value: 1 },
  uTrailScale: { value: 1 },
  uBeamScale: { value: 1 },
  uColor: { value: new THREE.Color('#dbe7ff') },
});

export const MeteorImpact: React.FC<MeteorImpactProps> = ({ impactQueueRef, manualMeteorQueueRef, protectedPositionRef }) => {
  const { size } = useThree();
  const particlesRefs = useRef<Array<THREE.Object3D | null>>([]);
  const flashRefs = useRef<Array<THREE.Mesh | null>>([]);
  const { viewState, visualMode } = useGalaxyStore();
  const randomRef = useRef(createSeededRandom(20260520));
  const impactId = useRef(0);
  const nextLaunchAt = useRef(2.2);
  const queuedLaunches = useRef<number[]>([]);
  const slots = useRef<MeteorSlot[]>(Array.from({ length: maxMeteorSlots }, createMeteorSlot));
  const clock = useRef(0);
  const isMobilePortrait = size.width <= 768 && size.height > size.width;
  const safeTargetRef = useRef(new THREE.Vector3());
  const fallbackTargetRef = useRef(new THREE.Vector3());
  const safeDirectionRef = useRef(new THREE.Vector3());
  const travelRef = useRef(new THREE.Vector3());

  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(meteorParticleCount * 3), 3));
    const trail = new Float32Array(meteorParticleCount);
    const angle = new Float32Array(meteorParticleCount);
    const spread = new Float32Array(meteorParticleCount);
    const size = new Float32Array(meteorParticleCount);
    const alpha = new Float32Array(meteorParticleCount);
    const flicker = new Float32Array(meteorParticleCount);
    const random = createSeededRandom(4040);

    for (let i = 0; i < meteorParticleCount; i++) {
      const isHeadDust = random() > 0.68;
      trail[i] = isHeadDust ? Math.pow(random(), 2.8) * 0.32 : Math.pow(random(), 0.72);
      angle[i] = random() * Math.PI * 2;
      spread[i] = Math.pow(random(), 1.7) * 0.86 + 0.08;
      size[i] = 2.2 + random() * (isHeadDust ? 3.4 : 2.0);
      alpha[i] = 0.22 + random() * (isHeadDust ? 0.72 : 0.46);
      flicker[i] = random();
    }

    geometry.setAttribute('aTrail', new THREE.BufferAttribute(trail, 1));
    geometry.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
    geometry.setAttribute('aSpread', new THREE.BufferAttribute(spread, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    geometry.setAttribute('aFlicker', new THREE.BufferAttribute(flicker, 1));
    return geometry;
  }, []);

  const uniforms = useMemo(() => Array.from({ length: maxMeteorSlots }, createMeteorUniforms), []);

  const particleMaterials = useMemo(() => uniforms.map((slotUniforms) => new THREE.ShaderMaterial({
      vertexShader: meteorVertexShader,
      fragmentShader: meteorFragmentShader,
      uniforms: slotUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })),
    [uniforms]
  );

  const chooseSafeTarget = () => {
    const random = randomRef.current;
    const protectedPosition = protectedPositionRef.current;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 5.6 + random() * 5.4;
      const target = safeTargetRef.current.set(Math.cos(angle) * radius, 0.02, Math.sin(angle) * radius);
      if (target.distanceTo(protectedPosition) >= shipSafeDistance) {
        return target;
      }
    }

    const fallbackAngle = Math.atan2(protectedPosition.z, protectedPosition.x) + Math.PI * (0.42 + random() * 0.28);
    const fallbackRadius = THREE.MathUtils.clamp(protectedPosition.length() + 1.2 + random() * 1.8, 5.6, 10.6);
    return fallbackTargetRef.current.set(Math.cos(fallbackAngle) * fallbackRadius, 0.02, Math.sin(fallbackAngle) * fallbackRadius);
  };

  const nudgeTargetAwayFromShip = (slot: MeteorSlot) => {
    const protectedPosition = protectedPositionRef.current;
    if (slot.target.distanceTo(protectedPosition) >= shipSafeDistance) return;

    const safeDirection = safeDirectionRef.current.copy(slot.target).sub(protectedPosition);
    if (safeDirection.lengthSq() < 0.001) {
      safeDirection.set(-protectedPosition.z, 0, protectedPosition.x);
    }
    safeDirection.normalize();
    slot.target.copy(protectedPosition).add(safeDirection.multiplyScalar(shipSafeDistance + 0.45));
    slot.target.y = 0.02;
    slot.direction.copy(slot.target).sub(slot.start).normalize();
    slot.sideA.crossVectors(slot.direction, worldUp);
    if (slot.sideA.lengthSq() < 0.001) {
      slot.sideA.crossVectors(slot.direction, worldRight);
    }
    slot.sideA.normalize();
    slot.sideB.crossVectors(slot.direction, slot.sideA).normalize();
  };

  const launchMeteor = (slot: MeteorSlot, manualTarget?: THREE.Vector3) => {
    const random = randomRef.current;
    const target = manualTarget ?? chooseSafeTarget();
    const travel = travelRef.current.set(
      -5.4 - random() * 2.2,
      2.3 + random() * 1.2,
      -2.2 + random() * 4.4
    ).normalize();

    slot.target.copy(target);
    slot.start.copy(slot.target).add(travel.multiplyScalar(9.0 + random() * 2.2));
    slot.direction.copy(slot.target).sub(slot.start).normalize();
    slot.sideA.crossVectors(slot.direction, worldUp);
    if (slot.sideA.lengthSq() < 0.001) {
      slot.sideA.crossVectors(slot.direction, worldRight);
    }
    slot.sideA.normalize();
    slot.sideB.crossVectors(slot.direction, slot.sideA).normalize();
    slot.flightDuration = manualTarget ? 0.78 : 0.82 + random() * 0.28;
    slot.phase = 'flying';
    slot.phaseTime = 0;
  };

  const updateMeteorUniforms = (slot: MeteorSlot, index: number, opacity: number, progress: number) => {
    const slotUniforms = uniforms[index];
    slotUniforms.uHead.value.copy(slot.head);
    slotUniforms.uTarget.value.copy(slot.target);
    slotUniforms.uDirection.value.copy(slot.direction);
    slotUniforms.uSideA.value.copy(slot.sideA);
    slotUniforms.uSideB.value.copy(slot.sideB);
    slotUniforms.uProgress.value = progress;
    slotUniforms.uTime.value = clock.current;
    slotUniforms.uOpacity.value = opacity;
    slotUniforms.uSizeScale.value = isMobilePortrait ? 0.42 : 1;
    slotUniforms.uTrailScale.value = isMobilePortrait ? 0.72 : 1;
    slotUniforms.uBeamScale.value = isMobilePortrait ? 0.48 : 1;
    const points = particlesRefs.current[index];
    if (points) points.visible = opacity > 0.01;
  };

  const scheduleMeteorWave = () => {
    const random = randomRef.current;
    const freeSlots = slots.current.filter((slot) => slot.phase === 'idle').length;
    if (freeSlots === 0) {
      queuedLaunches.current = [];
      return;
    }

    const roll = random();
    const requestedCount = roll > 0.84 ? 3 : roll > 0.48 ? 2 : 1;
    const launchCount = Math.min(requestedCount, freeSlots, maxMeteorSlots);
    queuedLaunches.current = Array.from({ length: launchCount }, (_, index) => clock.current + index * (0.36 + random() * 0.18));
  };

  useFrame((_, delta) => {
    const canRun = visualMode !== 'silent' && (viewState === 'HOME' || viewState === 'HOVER_PLANET');
    const mobileMeteorScale = isMobilePortrait ? 0.54 : 1;
    const meteorOpacity = (visualMode === 'focus' ? 0.48 : 0.95) * mobileMeteorScale;
    const impactStrength = (visualMode === 'focus' ? 0.48 : 1.15) * (isMobilePortrait ? 0.46 : 1);
    clock.current += delta;

    if (!canRun) {
      manualMeteorQueueRef.current = [];
      queuedLaunches.current = [];
      nextLaunchAt.current = clock.current + 1.8;
      slots.current.forEach((slot, index) => {
        slot.phase = 'idle';
        slot.phaseTime = 0;
        updateMeteorUniforms(slot, index, 0, 0);
        const flash = flashRefs.current[index];
        if (flash) flash.visible = false;
      });
      return;
    }

    while (manualMeteorQueueRef.current.length > 0) {
      const slot = slots.current.find((candidate) => candidate.phase === 'idle');
      if (!slot) break;
      const manualMeteor = manualMeteorQueueRef.current.shift();
      if (!manualMeteor) break;
      launchMeteor(slot, manualMeteor.target);
    }

    if (clock.current >= nextLaunchAt.current) {
      scheduleMeteorWave();
      nextLaunchAt.current = clock.current + (visualMode === 'focus' ? 8 : 4) + randomRef.current() * (visualMode === 'focus' ? 4 : 2);
    }

    while (queuedLaunches.current.length > 0 && queuedLaunches.current[0] <= clock.current) {
      const slot = slots.current.find((candidate) => candidate.phase === 'idle');
      if (!slot) break;
      queuedLaunches.current.shift();
      launchMeteor(slot);
    }

    slots.current.forEach((slot, index) => {
      if (slot.phase === 'flying') {
        slot.phaseTime += delta;
        const progress = Math.min(slot.phaseTime / slot.flightDuration, 1);
        const eased = easeOutCubic(progress);
        slot.head.lerpVectors(slot.start, slot.target, eased);
        updateMeteorUniforms(slot, index, meteorOpacity, progress);

        if (progress >= 1) {
          nudgeTargetAwayFromShip(slot);
          impactId.current += 1;
          impactQueueRef.current.push({
            id: impactId.current,
            point: slot.target.clone(),
            strength: impactStrength,
          });
          slot.phase = 'flash';
          slot.phaseTime = 0;
          updateMeteorUniforms(slot, index, 0, 1);
          const flash = flashRefs.current[index];
          if (flash) {
            flash.visible = true;
            flash.position.copy(slot.target);
            flash.scale.setScalar(0.1);
          }
        }
      }

      if (slot.phase === 'flash') {
        slot.phaseTime += delta;
        const progress = Math.min(slot.phaseTime / 0.52, 1);
        const flash = flashRefs.current[index];
        if (flash) {
          flash.scale.setScalar((0.4 + progress * 2.8) * (isMobilePortrait ? 0.52 : 1));
          const material = flash.material as THREE.MeshBasicMaterial;
          material.opacity = (1 - progress) * (isMobilePortrait ? 0.2 : 0.42);
        }
        if (progress >= 1) {
          slot.phase = 'idle';
          slot.phaseTime = 0;
          if (flash) flash.visible = false;
        }
      }
    });
  });

  return (
    <group>
      {particleMaterials.map((particleMaterial, index) => (
        <React.Fragment key={index}>
          <points
            ref={(element) => { particlesRefs.current[index] = element; }}
            geometry={particleGeometry}
            material={particleMaterial}
            visible={false}
          />
          <mesh
            ref={(element) => { flashRefs.current[index] = element; }}
            visible={false}
            rotation-x={-Math.PI / 2}
          >
            <ringGeometry args={[0.15, 0.22, 48]} />
            <meshBasicMaterial color="#dbe7ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};
