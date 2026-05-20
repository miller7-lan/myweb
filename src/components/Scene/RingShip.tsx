import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { createSeededRandom } from '../../utils/random';

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
const baseFlowVelocity = 0.026;

export const RingShip: React.FC<RingShipProps> = ({ impactsRef, ringTimeRef, shipPositionRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const drawingRef = useRef<THREE.Group>(null);
  const randomRef = useRef(createSeededRandom(260520));
  const { camera } = useThree();
  const angleRef = useRef(1.1);
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
  const { viewState, visualMode } = useGalaxyStore();

  const shipLineGeometry = useMemo(() => {
    const points = [
      // hull
      -0.24, -0.08, 0, 0.24, -0.08, 0,
      -0.24, -0.08, 0, -0.14, -0.18, 0,
      -0.14, -0.18, 0, 0.15, -0.18, 0,
      0.15, -0.18, 0, 0.24, -0.08, 0,
      // mast
      0, -0.08, 0, 0, 0.26, 0,
      // sail
      0, 0.22, 0, 0.18, 0.02, 0,
      0.18, 0.02, 0, 0, -0.04, 0,
      // small flag / bow hint
      0, 0.26, 0, -0.09, 0.2, 0,
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, []);

  const wakeLineGeometry = useMemo(() => {
    const points = [
      -0.24, -0.22, 0, -0.1, -0.22, 0,
      0.02, -0.24, 0, 0.18, -0.24, 0,
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, []);

  const hullMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: '#f8fafc',
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  const wakeMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: '#93c5fd',
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  useFrame((_, delta) => {
    const visible = viewState === 'HOME' || viewState === 'HOVER_PLANET';
    const dt = Math.min(delta, 0.033);
    const motionScale = visualMode === 'silent' ? 0.32 : visualMode === 'focus' ? 0.62 : 1;
    const visualScale = visualMode === 'silent' ? 0.66 : visualMode === 'focus' ? 0.78 : 1;
    const random = randomRef.current;
    const ringTime = ringTimeRef.current;

    if (ringTime >= nextCurrentShiftAt.current) {
      nextCurrentShiftAt.current = ringTime + 8 + random() * 7;
      targetFlowVelocityRef.current = 0.022 + random() * 0.008;
      targetRadiusRef.current = 6.85 + (random() - 0.5) * 0.42;
    }

    if (visible) {
      flowVelocityRef.current = THREE.MathUtils.lerp(flowVelocityRef.current, targetFlowVelocityRef.current, 0.006);
      radiusRef.current = THREE.MathUtils.lerp(radiusRef.current, targetRadiusRef.current, 0.004);
      angleRef.current += delta * flowVelocityRef.current * motionScale;
    }

    const laneRadius = radiusRef.current + Math.sin(ringTime * 0.34 + angleRef.current * 1.6) * 0.08;
    const effectiveAngle = angleRef.current + tangentOffsetRef.current;

    const basePosition = new THREE.Vector3(
      Math.cos(effectiveAngle) * laneRadius,
      0.12,
      Math.sin(effectiveAngle) * laneRadius
    );
    const tangent = new THREE.Vector3(-Math.sin(effectiveAngle), 0, Math.cos(effectiveAngle));
    const radial = new THREE.Vector3(Math.cos(effectiveAngle), 0, Math.sin(effectiveAngle));

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
      const direction = basePosition.clone().sub(slot.point).normalize();
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

    const position = basePosition
      .add(radial.multiplyScalar(radialOffsetRef.current))
      .add(new THREE.Vector3(0, liftOffsetRef.current, 0));
    shipPositionRef.current.copy(position);

    if (!groupRef.current) return;

    groupRef.current.visible = visible;
    groupRef.current.position.copy(position);
    groupRef.current.quaternion.copy(camera.quaternion);
    groupRef.current.scale.setScalar(visualScale * (1.05 + liftOffsetRef.current * 0.18));

    if (drawingRef.current) {
      drawingRef.current.rotation.z = Math.sin(ringTime * 2.4) * 0.035 + leanOffsetRef.current;
      drawingRef.current.scale.x = 1;
    }

    const targetOpacity = visible ? (visualMode === 'silent' ? 0.48 : visualMode === 'focus' ? 0.64 : 0.88) : 0;
    hullMaterial.opacity = THREE.MathUtils.lerp(hullMaterial.opacity, targetOpacity, 0.12);
    wakeMaterial.opacity = THREE.MathUtils.lerp(wakeMaterial.opacity, targetOpacity * (0.16 + liftOffsetRef.current * 0.12), 0.12);
  });

  return (
    <group ref={groupRef}>
      <group ref={drawingRef}>
        <lineSegments geometry={shipLineGeometry} material={hullMaterial} />
        <lineSegments geometry={wakeLineGeometry} material={wakeMaterial} />
      </group>
    </group>
  );
};
