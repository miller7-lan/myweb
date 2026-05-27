import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { themes } from '../../data/themes';
import { useGalaxyStore } from '../../store/useGalaxyStore';

export const LockBeam: React.FC = () => {
  const pulseRef = useRef(0);
  const beamRef = useRef<THREE.Mesh>(null);
  const targetPosition = useRef(new THREE.Vector3());
  const midpoint = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const targetColor = useRef(new THREE.Color());
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((_, delta) => {
    const state = useGalaxyStore.getState();
    const theme = state.hoveredPlanet ? themes[state.hoveredPlanet] : null;
    const planetPosition = state.hoveredPlanet ? state.planetPositions[state.hoveredPlanet] : null;
    const isVisible = Boolean(theme && planetPosition) && (state.viewState === 'HOME' || state.viewState === 'HOVER_PLANET');
    const modeOpacity = state.visualMode === 'silent' ? 0.42 : state.visualMode === 'focus' ? 0.68 : 1;
    const beam = beamRef.current;
    if (!beam) return;

    const material = beam.material as THREE.MeshBasicMaterial;

    pulseRef.current += delta;
    const targetOpacity = isVisible ? (0.28 + Math.sin(pulseRef.current * 3.2) * 0.08) * modeOpacity : 0;
    material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.12);

    if (!theme || !planetPosition) return;

    targetPosition.current.fromArray(planetPosition);
    const length = targetPosition.current.length();
    midpoint.current.copy(targetPosition.current).multiplyScalar(0.5);
    direction.current.copy(targetPosition.current).normalize();
    beam.position.copy(midpoint.current);
    beam.scale.set(1, length, 1);
    beam.quaternion.setFromUnitVectors(up, direction.current);
    material.color.lerp(targetColor.current.set(theme.color), 0.18);
  });

  return (
    <mesh ref={beamRef}>
      <cylinderGeometry args={[0.018, 0.018, 1, 10, 1, true]} />
      <meshBasicMaterial
        color="#e2e8f0"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
