import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { createSeededRandom } from '../../utils/random';
import { introSpeed, introTiming } from '../../utils/intro';
import { wakeSourceCount, wakeTrail } from '../../utils/wakeTrail';

export type RingImpactSlot = {
  point: THREE.Vector3;
  startTime: number;
  strength: number;
};

interface RingShipProps {
  impactsRef: React.MutableRefObject<RingImpactSlot[]>;
  ringTimeRef: React.MutableRefObject<number>;
  shipPositionRef: React.MutableRefObject<THREE.Vector3>;
}

const impactLife = 1.85;
const impactRadius = 6.8;
const baseFlowVelocity = 0.108; // 20% higher than the ring's rotation speed (0.09)

// The opening animation assembles the ship in layers, each out of its own
// part of a swarm of ring particles: the hull, then the outriggers and
// struts, then the mast and sails, then the morning star and reactor. Each
// layer's particles gather onto its outline and its wireframe fades in as
// they fade out; then the lights come on and the thruster fires.
const swarmCount = 120;
const stageCount = 4;
const stageGap = 0.4;
// Which layer each particle belongs to (see swarmTargets).
const partStage = [0, 0, 1, 2, 2, 3];
const swarmStage = Array.from({ length: swarmCount }, (_, i) => partStage[i % 6]);
const swarmTargets = (() => {
  const random = createSeededRandom(4417);
  const points = new Float32Array(swarmCount * 3);
  const spot = (i: number, x: number, y: number, z: number) => points.set([x, y, z], i * 3);
  for (let i = 0; i < swarmCount; i += 1) {
    const u = random();
    const v = random();
    const part = i % 6;
    if (part === 0 || part === 1) spot(i, (v - 0.5) * 0.08 * (1 - u), (random() - 0.5) * 0.06, -0.31 + u * 0.62); // hull
    else if (part === 2) spot(i, (i % 12 < 6 ? -0.2 : 0.2) + (v - 0.5) * 0.04, -0.05, -0.16 + u * 0.42); // outriggers
    else if (part === 3) spot(i, (i % 12 < 6 ? -1 : 1) * (0.03 + u * 0.24), 0.08 + v * 0.28, 0.06); // sails
    else if (part === 4) spot(i, 0, u * 0.37, 0); // mast
    else spot(i, (u - 0.5) * 0.12, 0.39 + (v - 0.5) * 0.12, -0.04); // morning star
  }
  return points;
})();
const swarmStarts = (() => {
  const random = createSeededRandom(9031);
  const points = new Float32Array(swarmCount * 3);
  for (let i = 0; i < swarmCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 1.2 + random() * 1.6;
    points.set([Math.cos(angle) * distance, (random() - 0.5) * 0.5, Math.sin(angle) * distance], i * 3);
  }
  return points;
})();

export const RingShip: React.FC<RingShipProps> = ({ impactsRef, ringTimeRef, shipPositionRef }) => {
  const { size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const drawingRef = useRef<THREE.Group>(null);
  const starCoreRef = useRef<THREE.Mesh>(null);
  const starLightRef = useRef<THREE.PointLight>(null);
  const reactorRef = useRef<THREE.Mesh>(null);
  const thrusterRef = useRef<THREE.Mesh>(null);
  const randomRef = useRef(createSeededRandom(260520));
  // Front left of the ring, where the opening animation can assemble it in plain view.
  const angleRef = useRef(-0.9);
  const radiusRef = useRef(7.0);
  const targetRadiusRef = useRef(7.0);
  const flowVelocityRef = useRef(baseFlowVelocity);
  const targetFlowVelocityRef = useRef(baseFlowVelocity);
  const nextCurrentShiftAt = useRef(0);
  const tangentOffsetRef = useRef(0);
  const tangentVelocityRef = useRef(0);
  const radialOffsetRef = useRef(0);
  const radialVelocityRef = useRef(0);
  const liftOffsetRef = useRef(0);
  const liftVelocityRef = useRef(0);
  const leanOffsetRef = useRef(0);
  const leanVelocityRef = useRef(0);
  const basePositionRef = useRef(new THREE.Vector3());
  const tangentRef = useRef(new THREE.Vector3());
  const radialRef = useRef(new THREE.Vector3());
  const impactDirectionRef = useRef(new THREE.Vector3());
  const positionRef = useRef(new THREE.Vector3());
  const lookMatrixRef = useRef(new THREE.Matrix4());
  const lookTargetRef = useRef(new THREE.Vector3());
  const upRef = useRef(new THREE.Vector3(0, 1, 0));
  const targetQuaternionRef = useRef(new THREE.Quaternion());
  const { viewState, visualMode, introPlaying } = useGalaxyStore();
  const introPoints = useGalaxyStore((state) => state.introPoints);
  const isMobilePortrait = size.width <= 768 && size.height > size.width;
  // 0–1 each, per layer: its particles gathered, its wireframe shown; then
  // the lights on and the thruster firing.
  const assembly = useRef({ started: !introPlaying, gather: [1, 1, 1, 1], frame: [1, 1, 1, 1], lit: 1, thrust: 1 });
  const swarmRef = useRef<THREE.Points>(null);
  const swarmPositions = useMemo(() => Float32Array.from(swarmStarts), []);
  const swarmColors = useMemo(() => new Float32Array(swarmCount * 3), []);
  const appliedFrame = useRef('1,1,1,1');
  const framesDrawn = useRef(0);
  // The ship's real motion over the ring (ring time), for the wake.
  const track = useRef({ x: 0, z: 0, at: -1, vx: 0, vz: 0, turn: 0 });

  useEffect(() => {
    const state = assembly.current;
    const settle = (value: number) => {
      gsap.killTweensOf([state, state.gather, state.frame]);
      state.gather.fill(value);
      state.frame.fill(value);
      state.lit = value;
      state.thrust = value;
    };
    if (!introPlaying) {
      settle(1);
      state.started = true;
      return;
    }
    settle(0);
    state.started = false;
    if (!introPoints) return;
    const at = introTiming.ship;
    const tl = gsap.timeline().timeScale(introSpeed);
    tl.call(() => {
      state.started = true;
      // The ring keeps turning during the intro: start the ship at the
      // front left of the screen, wherever the ring has turned to.
      angleRef.current = 2.0 + (groupRef.current?.parent?.rotation.y ?? 0);
    }, undefined, at);
    for (let stage = 0; stage < stageCount; stage += 1) {
      const start = at + stage * stageGap;
      tl.to(state.gather, { [stage]: 1, duration: 0.55, ease: 'power2.inOut' }, start)
        .to(state.frame, { [stage]: 1, duration: 0.35, ease: 'power1.out' }, start + 0.45);
    }
    const lights = at + (stageCount - 1) * stageGap + 0.6;
    tl.to(state, { lit: 1, duration: 0.3, ease: 'back.out(2.5)' }, lights)
      .to(state, { thrust: 1, duration: 0.45, ease: 'power2.out' }, lights + 0.25);
    return () => {
      tl.kill();
    };
  }, [introPlaying, introPoints]);

  useFrame((_, delta) => {
    const build = assembly.current;
    // Drawn (fully transparent) even before it is assembled, so its shaders
    // and lights are ready and nothing stalls when it appears.
    const visible = viewState === 'HOME' || viewState === 'HOVER_PLANET';
    framesDrawn.current += 1;
    const dt = Math.min(delta, 0.033);
    const motionScale = visualMode === 'silent' ? 0.32 : visualMode === 'focus' ? 0.62 : 1;
    
    // Increased base scale by 20% (from 0.95 to 1.14)
    const reducedWake = visualMode === 'silent';
    const visualScale = (visualMode === 'silent' ? 0.66 : visualMode === 'focus' ? 0.78 : 1) * 1.14 * (isMobilePortrait ? 2.15 : 1);
    const ringTime = ringTimeRef.current;
    const random = randomRef.current;

    if (ringTime >= nextCurrentShiftAt.current) {
      nextCurrentShiftAt.current = ringTime + 8 + random() * 7;
      targetFlowVelocityRef.current = 0.098 + random() * 0.02; // Averages to 0.108
      targetRadiusRef.current = 6.85 + (random() - 0.5) * 0.42;
    }

    if (visible) {
      flowVelocityRef.current = THREE.MathUtils.lerp(flowVelocityRef.current, targetFlowVelocityRef.current, 0.006);
      radiusRef.current = THREE.MathUtils.lerp(radiusRef.current, targetRadiusRef.current, 0.004);
      angleRef.current += delta * flowVelocityRef.current * motionScale * build.thrust;
    }

    const laneRadius = radiusRef.current + Math.sin(ringTime * 0.34 + angleRef.current * 1.6) * 0.08;
    const effectiveAngle = angleRef.current + tangentOffsetRef.current;

    const basePosition = basePositionRef.current.set(
      Math.cos(effectiveAngle) * laneRadius,
      0.12,
      Math.sin(effectiveAngle) * laneRadius
    );
    const tangent = tangentRef.current.set(-Math.sin(effectiveAngle), 0, Math.cos(effectiveAngle)).normalize();
    const radial = radialRef.current.set(Math.cos(effectiveAngle), 0, Math.sin(effectiveAngle)).normalize();

    // Meteor wave impact forces
    let tangentForce = 0;
    let radialForce = 0;
    let liftForce = 0;
    let leanForce = 0;
    impactsRef.current.forEach((slot) => {
      const age = ringTime - slot.startTime;
      if (age < 0 || age > impactLife) return;

      const waveTravel = age / impactLife;
      const waveFront = waveTravel * impactRadius;
      const distanceToImpact = basePosition.distanceTo(slot.point);
      const waveAlignment = 1 - THREE.MathUtils.smoothstep(Math.abs(distanceToImpact - waveFront), 0, 1.55);
      const nearImpact = (1 - THREE.MathUtils.smoothstep(distanceToImpact, 0.2, 2.75)) * Math.pow(1 - THREE.MathUtils.clamp(waveTravel, 0, 1), 2.35);
      const distanceFalloff = 1 - THREE.MathUtils.smoothstep(distanceToImpact, 0.8, 8.6);
      const waveFalloff = Math.pow(1 - THREE.MathUtils.clamp(waveTravel, 0, 1), 0.92);
      const influence = (waveAlignment * waveFalloff * 1.05 + nearImpact * 0.95) * (0.42 + distanceFalloff * 0.85) * slot.strength;

      if (influence <= 0) return;
      const direction = impactDirectionRef.current.copy(basePosition).sub(slot.point).normalize();
      const tangentDirection = direction.dot(tangent);
      const radialDirection = direction.dot(radial);
      tangentForce += influence * tangentDirection * 3.6;
      radialForce += influence * radialDirection * 3.2;
      liftForce += influence * (1.6 + distanceFalloff * 1.2);
      leanForce += influence * tangentDirection * 3.8;
    });

    const tangentAcceleration = tangentForce - tangentVelocityRef.current * 1.05;
    tangentVelocityRef.current += tangentAcceleration * dt;
    tangentOffsetRef.current += tangentVelocityRef.current * dt;
    tangentOffsetRef.current = THREE.MathUtils.clamp(tangentOffsetRef.current, -0.55, 0.55);
    tangentVelocityRef.current = THREE.MathUtils.clamp(tangentVelocityRef.current, -0.38, 0.38);

    const radialAcceleration = radialForce - radialVelocityRef.current * 1.2;
    radialVelocityRef.current += radialAcceleration * dt;
    radialOffsetRef.current += radialVelocityRef.current * dt;
    radialOffsetRef.current = THREE.MathUtils.clamp(radialOffsetRef.current, -0.82, 0.82);

    const liftAcceleration = liftForce - liftOffsetRef.current * 4.1 - liftVelocityRef.current * 1.75;
    liftVelocityRef.current += liftAcceleration * dt;
    liftOffsetRef.current += liftVelocityRef.current * dt;
    liftOffsetRef.current = THREE.MathUtils.clamp(liftOffsetRef.current, -0.1, 0.62);

    const leanAcceleration = leanForce - leanOffsetRef.current * 3.8 - leanVelocityRef.current * 1.8;
    leanVelocityRef.current += leanAcceleration * dt;
    leanOffsetRef.current += leanVelocityRef.current * dt;
    leanOffsetRef.current = THREE.MathUtils.clamp(leanOffsetRef.current, -0.36, 0.36);

    const position = positionRef.current
      .copy(basePosition)
      .addScaledVector(radial, radialOffsetRef.current);
    position.y += liftOffsetRef.current;
    shipPositionRef.current.copy(position);
    // The wake follows the ship's speed: none until the thruster fires.
    const wakeStrength = visible ? build.thrust * THREE.MathUtils.clamp(flowVelocityRef.current / baseFlowVelocity, 0.6, 1.3) * (visualMode === 'silent' ? 0.4 : 1) : 0;

    // Follow where the ship really goes (pushed by meteors, drifting
    // between lanes) and leave a wave source on its path every so often.
    const motion = track.current;
    const ringDt = ringTime - motion.at;
    if (motion.at < 0 || ringDt > 0.5 || ringDt < 0) {
      motion.x = position.x;
      motion.z = position.z;
      motion.at = ringTime;
    } else if (ringDt > 0.0005) {
      const vx = (position.x - motion.x) / ringDt;
      const vz = (position.z - motion.z) / ringDt;
      const blend = 1 - Math.exp(-ringDt * 6);
      const nextVx = motion.vx + (vx - motion.vx) * blend;
      const nextVz = motion.vz + (vz - motion.vz) * blend;
      const before = Math.hypot(motion.vx, motion.vz);
      const after = Math.hypot(nextVx, nextVz);
      if (before > 1e-4 && after > 1e-4) {
        const turnRate = (motion.vx * nextVz - motion.vz * nextVx) / (before * after) / ringDt;
        motion.turn += (turnRate - motion.turn) * (1 - Math.exp(-ringDt * 3));
      }
      motion.vx = nextVx;
      motion.vz = nextVz;
      motion.x = position.x;
      motion.z = position.z;
      motion.at = ringTime;
    }
    if (ringTime - wakeTrail.lastAt >= wakeTrail.every || ringTime < wakeTrail.lastAt) {
      wakeTrail.lastAt = ringTime;
      const i = wakeTrail.cursor;
      wakeTrail.cursor = (i + 1) % wakeSourceCount;
      // The stern, not the middle of the ship.
      const speed = Math.hypot(motion.vx, motion.vz);
      const back = speed > 1e-4 ? (visualScale * 0.3) / speed : 0;
      wakeTrail.points[i].set(position.x - motion.vx * back, position.z - motion.vz * back, ringTime, reducedWake ? wakeStrength * 0.5 : wakeStrength);
      wakeTrail.motion[i].set(motion.vx, motion.vz, motion.turn);
    }

    if (!groupRef.current) return;

    groupRef.current.visible = visible;
    groupRef.current.position.copy(position);

    // Dynamic 3D alignment to orbit path tangent
    lookTargetRef.current.copy(position).add(tangent);
    lookMatrixRef.current.lookAt(position, lookTargetRef.current, upRef.current);
    targetQuaternionRef.current.setFromRotationMatrix(lookMatrixRef.current);
    groupRef.current.quaternion.copy(targetQuaternionRef.current);

    groupRef.current.scale.setScalar(visualScale * (1.0 + liftOffsetRef.current * 0.16));

    // Fade each layer's wireframe in, relative to each part's own opacity.
    const frameKey = build.frame.join(',');
    if (frameKey !== appliedFrame.current && drawingRef.current) {
      appliedFrame.current = frameKey;
      for (const part of drawingRef.current.children) {
        const fade = build.frame[part.userData.stage ?? 0];
        part.traverse((child) => {
          if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.Material) || !child.material.transparent) return;
          const material = child.material;
          if (material.userData.baseOpacity === undefined) material.userData.baseOpacity = material.opacity;
          material.opacity = material.userData.baseOpacity * fade;
        });
      }
    }
    if (swarmRef.current) {
      const showSwarm = (build.started && build.frame[stageCount - 1] < 1) || framesDrawn.current < 3;
      swarmRef.current.visible = showSwarm;
      if (showSwarm) {
        const geometry = swarmRef.current.geometry;
        const positions = geometry.attributes.position.array as Float32Array;
        const colors = geometry.attributes.color.array as Float32Array;
        for (let i = 0; i < swarmCount; i += 1) {
          const stage = swarmStage[i];
          const t = build.gather[stage];
          // Additive blending: a darker colour is a fainter particle.
          const glow = Math.min(1, t * 3) * (1 - build.frame[stage]);
          for (let k = 0; k < 3; k += 1) {
            const j = i * 3 + k;
            positions[j] = swarmStarts[j] + (swarmTargets[j] - swarmStarts[j]) * t;
          }
          colors[i * 3] = 0.99 * glow;
          colors[i * 3 + 1] = 0.9 * glow;
          colors[i * 3 + 2] = 0.54 * glow;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
      }
    }

    // Twinkling Morning Star & its dynamic physical light source
    if (starCoreRef.current) {
      const starScale = 1.0 + Math.sin(ringTime * 6.5) * 0.22;
      starCoreRef.current.scale.setScalar(starScale * (isMobilePortrait ? 0.66 : 1) * Math.max(build.lit, 0.001));
    }
    if (starLightRef.current) {
      const pulse = 0.72 + Math.sin(ringTime * 6.5) * 0.28;
      const mobileLightScale = isMobilePortrait ? 0.28 : 1;
      starLightRef.current.intensity = (visualMode === 'silent' ? 1.8 : visualMode === 'focus' ? 3.6 : 5.5) * pulse * mobileLightScale * build.lit;
      starLightRef.current.distance = isMobilePortrait ? 1.35 : 2.5;
    }

    // Fusion Core Reactor
    if (reactorRef.current) {
      reactorRef.current.rotation.y = ringTime * 2.8;
      reactorRef.current.rotation.x = ringTime * 1.4;
      reactorRef.current.scale.setScalar(Math.max(build.lit, 0.001));
    }

    // High frequency plasma thruster flicker
    if (thrusterRef.current) {
      const flicker = 0.82 + Math.sin(ringTime * 14.0) * 0.18;
      thrusterRef.current.scale.set(flicker, flicker, Math.max((0.92 + Math.cos(ringTime * 18.0) * 0.22) * build.thrust, 0.001));
    }
  });

  return (
    <>
    <group ref={groupRef}>
      <points ref={swarmRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={swarmCount} args={[swarmPositions, 3]} />
          <bufferAttribute attach="attributes-color" count={swarmCount} args={[swarmColors, 3]} />
        </bufferGeometry>
        <pointsMaterial vertexColors size={0.06} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <group ref={drawingRef}>
        {/* 1. 微型核聚变星核光源 (Point light from fusion core - steady secondary ambient light) */}
        <pointLight position={[0, 0.035, 0.20]} intensity={0.65} distance={1.0} color="#fbbf24" />

        {/* 2. 船头顶「启明星」闪烁点光源 (Pulsing primary Point light that physically twinkles and illuminates sails/outriggers below) */}
        <pointLight 
          ref={starLightRef} 
          position={[0, 0.39, -0.04]} 
          intensity={isMobilePortrait ? 1.5 : 5.5} 
          distance={isMobilePortrait ? 1.35 : 2.5} 
          color="#fde68a" 
        />

        {/* 1. 中央主甲板船舱 (Holographic Wireframe Central Hull) */}
        {/* Outline Wireframe */}
        <mesh userData={{ stage: 0 }} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.075, 0.62, 5]} />
          <meshStandardMaterial 
            color="#ffffff" 
            wireframe 
            transparent 
            opacity={0.88}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Soft semi-transparent backing hull for physical structure */}
        <mesh userData={{ stage: 0 }} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.074, 0.61, 5]} />
          <meshStandardMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.08}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
        
        {/* Central cabin wireframe canopy */}
        <mesh userData={{ stage: 0 }} position={[0, 0.03, -0.06]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial 
            color="#ffffff" 
            wireframe
            transparent
            opacity={0.72}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 2. 左侧体稳定浮筒 (Left Outrigger Wireframe Hull) */}
        <mesh userData={{ stage: 1 }} position={[-0.20, -0.05, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.038, 0.42, 4]} />
          <meshStandardMaterial 
            color="#ffffff" 
            wireframe
            transparent
            opacity={0.78}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh userData={{ stage: 1 }} position={[-0.20, -0.05, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.037, 0.41, 4]} />
          <meshStandardMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.06}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>

        {/* 3. 右侧体稳定浮筒 (Right Outrigger Wireframe Hull) */}
        <mesh userData={{ stage: 1 }} position={[0.20, -0.05, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.038, 0.42, 4]} />
          <meshStandardMaterial 
            color="#ffffff" 
            wireframe
            transparent
            opacity={0.78}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh userData={{ stage: 1 }} position={[0.20, -0.05, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.037, 0.41, 4]} />
          <meshStandardMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.06}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>

        {/* 4. 连接桥臂 (Connecting Struts - Wireframe) */}
        <mesh userData={{ stage: 1 }} position={[-0.10, -0.025, 0]}>
          <boxGeometry args={[0.18, 0.015, 0.08]} />
          <meshStandardMaterial color="#ffffff" wireframe transparent opacity={0.68} />
        </mesh>
        <mesh userData={{ stage: 1 }} position={[0.10, -0.025, 0]}>
          <boxGeometry args={[0.18, 0.015, 0.08]} />
          <meshStandardMaterial color="#ffffff" wireframe transparent opacity={0.68} />
        </mesh>

        {/* 5. 中央桅杆 (Mast) */}
        <mesh userData={{ stage: 2 }} position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.006, 0.009, 0.38, 5]} />
          <meshStandardMaterial color="#ffffff" wireframe transparent opacity={0.74} />
        </mesh>

        {/* 6. 双折射轻量太阳帆 (Double Swept-Back Holographic Sails) */}
        {/* Left Wing Sail */}
        <group userData={{ stage: 2 }} position={[-0.15, 0.22, 0.06]} rotation={[0, Math.PI / 7, -Math.PI / 15]}>
          {/* Sail Border Outline */}
          <mesh>
            <boxGeometry args={[0.26, 0.28, 0.003]} />
            <meshStandardMaterial 
              color="#ffffff" 
              wireframe
              transparent 
              opacity={0.90}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Sail energy field sheet (faint and ethereal) */}
          <mesh>
            <boxGeometry args={[0.258, 0.278, 0.001]} />
            <meshStandardMaterial 
              color="#ffffff" 
              transparent 
              opacity={0.12}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
        
        {/* Right Wing Sail */}
        <group userData={{ stage: 2 }} position={[0.15, 0.22, 0.06]} rotation={[0, -Math.PI / 7, Math.PI / 15]}>
          {/* Sail Border Outline */}
          <mesh>
            <boxGeometry args={[0.26, 0.28, 0.003]} />
            <meshStandardMaterial 
              color="#ffffff" 
              wireframe
              transparent 
              opacity={0.90}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Sail energy field sheet */}
          <mesh>
            <boxGeometry args={[0.258, 0.278, 0.001]} />
            <meshStandardMaterial 
              color="#ffffff" 
              transparent 
              opacity={0.12}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* 7. 3D 金色「启明星」星芒 (3D Twinkling Morning Star - Wireframe & Lines) */}
        <group userData={{ stage: 3 }} position={[0, 0.39, -0.04]}>
          {/* Intense Solid Starlight Core Sphere (The visible light bulb!) */}
          <mesh ref={starCoreRef}>
            <sphereGeometry args={[0.032, 10, 10]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Outer Twinkling Gold Aura Wireframe Octahedron 1 */}
          <mesh>
            <octahedronGeometry args={[0.065]} />
            <meshBasicMaterial 
              color="#fbbf24" 
              wireframe 
              transparent 
              opacity={0.92} 
            />
          </mesh>
          {/* Outer Twinkling Gold Aura Wireframe Octahedron 2 (Cross-rotated for detailed star lattice) */}
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <octahedronGeometry args={[0.065]} />
            <meshBasicMaterial 
              color="#f59e0b" 
              wireframe 
              transparent 
              opacity={0.78} 
            />
          </mesh>
          {/* Long Vertical light needle */}
          <mesh>
            <cylinderGeometry args={[0.003, 0.003, 0.26, 4]} />
            <meshBasicMaterial color="#fde68a" transparent opacity={0.88} />
          </mesh>
          {/* Long Horizontal light needle */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.003, 0.003, 0.26, 4]} />
            <meshBasicMaterial color="#fde68a" transparent opacity={0.88} />
          </mesh>
          {/* Short Diagonal needles */}
          <mesh rotation={[Math.PI / 4, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.002, 0.002, 0.16, 4]} />
            <meshBasicMaterial color="#fde68a" transparent opacity={0.65} />
          </mesh>
          <mesh rotation={[-Math.PI / 4, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.002, 0.002, 0.16, 4]} />
            <meshBasicMaterial color="#fde68a" transparent opacity={0.65} />
          </mesh>
        </group>

        {/* 8. 恒星能量反应炉 (Fusion Reactor Core - Amber Gold Wireframe) */}
        <group userData={{ stage: 3 }} position={[0, 0.035, 0.20]}>
          <mesh ref={reactorRef}>
            <octahedronGeometry args={[0.035]} />
            <meshBasicMaterial 
              color="#fbbf24" 
              wireframe 
              transparent 
              opacity={0.90} 
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.065, 0.005, 6, 24]} />
            <meshBasicMaterial 
              color="#fbbf24" 
              wireframe
              transparent 
              opacity={0.82} 
            />
          </mesh>
        </group>

        {/* 9. 等离子引擎喷口 (Engine Nozzle - Wireframe) */}
        <mesh userData={{ stage: 1 }} position={[0, 0, 0.31]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.024, 0.06, 6]} />
          <meshStandardMaterial color="#cbd5e1" wireframe transparent opacity={0.78} />
        </mesh>

        {/* 10. 等离子引擎尾羽 (Flickering Plasma Thruster Tail Plume - Wireframe Cone) */}
        <mesh userData={{ stage: 3 }} ref={thrusterRef} position={[0, 0, 0.44]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.038, 0.22, 8, 2, true]} />
          <meshBasicMaterial 
            color="#e0f2fe" 
            wireframe
            transparent 
            opacity={0.65} 
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
    </>
  );
};
