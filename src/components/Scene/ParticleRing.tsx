import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { particleVertexShader, particleFragmentShader } from '../../shaders/particles';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { createSeededRandom } from '../../utils/random';
import { MeteorImpact, type ManualMeteorEvent, type RingImpactEvent } from './MeteorImpact';
import { RingShip, type RingImpactSlot } from './RingShip';

interface ParticleRingProps {
  mousePosRef: React.RefObject<THREE.Vector3>;
  mouseScreenPosRef: React.RefObject<THREE.Vector2>;
  screenAspect: number;
}

export const ParticleRing: React.FC<ParticleRingProps> = ({ mousePosRef, mouseScreenPosRef, screenAspect }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const impactQueueRef = useRef<RingImpactEvent[]>([]);
  const manualMeteorQueueRef = useRef<ManualMeteorEvent[]>([]);
  const manualMeteorId = useRef(0);
  const nextManualMeteorAt = useRef(0);
  const shipPositionRef = useRef(new THREE.Vector3(6.8, 0.12, 0));
  const impactSlotCursor = useRef(0);
  const impactSlots = useRef<RingImpactSlot[]>(
    Array.from({ length: 4 }, () => ({
      point: new THREE.Vector3(),
      startTime: -999,
      strength: 0,
    }))
  );

  const particleCount = 12000;
  
  const [positions, randoms, initialPositions] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const rnd = new Float32Array(particleCount);
    const initPos = new Float32Array(particleCount * 3);
    const random = createSeededRandom(12000);
    
    for (let i = 0; i < particleCount; i++) {
      // Create multi-layered rings
      const angle = random() * Math.PI * 2;
      
      const rRand = random();
      let r;
      if (rRand < 0.3) {
        // inner sparse ring
        r = 3.5 + random() * 1.5;
      } else if (rRand < 0.8) {
        // main ring
        r = 5.2 + random() * 3.5;
      } else {
        // outer sparse ring
        r = 8.8 + random() * 4.0;
      }
      
      // Extremely thin y-axis (flat disc)
      const y = (random() - 0.5) * 0.1;
      
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      
      rnd[i] = random();

      initPos[i * 3] = (random() - 0.5) * 120;
      initPos[i * 3 + 1] = (random() - 0.5) * 120;
      initPos[i * 3 + 2] = (random() - 0.5) * 120 - 20;
    }
    return [pos, rnd, initPos];
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMousePos: { value: new THREE.Vector3() },
    uMouseScreenPos: { value: new THREE.Vector2() },
    uAspect: { value: 1 },
    uParticleSize: { value: 3.5 },
    uColor: { value: new THREE.Color('#8a8a98') }, // Faint glow between background and planets
    uGlowColor: { value: new THREE.Color('#aeb7c8') },
    uHoverBrightness: { value: 0.0 },
    uOpacity: { value: 1.0 },
    uIntroProgress: { value: 0.0 },
    uImpactPoints: { value: Array.from({ length: 4 }, () => new THREE.Vector3()) },
    uImpactStartTimes: { value: Array.from({ length: 4 }, () => -999) },
    uImpactStrengths: { value: Array.from({ length: 4 }, () => 0.0) },
    uImpactRadius: { value: 6.8 }
  }), []);

  const { viewState, visualMode } = useGalaxyStore();
  const localTime = useRef(0);

  const handleManualMeteor = (event: { point: THREE.Vector3; stopPropagation: () => void }) => {
    if (!groupRef.current) return;
    if (visualMode === 'silent') return;
    if (viewState !== 'HOME' && viewState !== 'HOVER_PLANET') return;
    if (localTime.current < nextManualMeteorAt.current) return;

    event.stopPropagation();
    const target = groupRef.current.worldToLocal(event.point.clone());
    target.y = 0.02;
    manualMeteorId.current += 1;
    manualMeteorQueueRef.current.push({
      id: manualMeteorId.current,
      target,
    });
    nextManualMeteorAt.current = localTime.current + 2.9;
  };

  useFrame((_, delta) => {
    const motionScale = visualMode === 'silent' ? 0.08 : visualMode === 'focus' ? 0.36 : 1;

    if (viewState !== 'THEME') {
      localTime.current += delta * motionScale;
      if (groupRef.current) {
        groupRef.current.rotation.y -= delta * motionScale * 0.09; // Counter-clockwise ring rotation
      }
    }
    
    if (groupRef.current) {
      groupRef.current.rotation.x = Math.PI * 0.12; // Flat disc tilted 21 degrees
    }
    
    if (materialRef.current) {
      while (impactQueueRef.current.length > 0) {
        const pendingImpact = impactQueueRef.current.shift();
        if (!pendingImpact) break;
        const expiredSlot = impactSlots.current.findIndex(
          (slot) => localTime.current - slot.startTime > 1.55
        );
        const slotIndex = expiredSlot >= 0 ? expiredSlot : impactSlotCursor.current;
        impactSlotCursor.current = (slotIndex + 1) % impactSlots.current.length;

        const slot = impactSlots.current[slotIndex];
        slot.point.copy(pendingImpact.point);
        slot.startTime = localTime.current;
        slot.strength = pendingImpact.strength;

        materialRef.current.uniforms.uImpactPoints.value[slotIndex].copy(slot.point);
        materialRef.current.uniforms.uImpactStartTimes.value[slotIndex] = slot.startTime;
        materialRef.current.uniforms.uImpactStrengths.value[slotIndex] = slot.strength;
      }
      materialRef.current.uniforms.uTime.value = localTime.current;
      materialRef.current.uniforms.uMousePos.value.copy(mousePosRef.current);
      materialRef.current.uniforms.uMouseScreenPos.value.copy(mouseScreenPosRef.current);
      materialRef.current.uniforms.uAspect.value = screenAspect;
      materialRef.current.uniforms.uParticleSize.value = visualMode === 'silent' ? 2.25 : visualMode === 'focus' ? 2.85 : 3.5;
      materialRef.current.uniforms.uOpacity.value = visualMode === 'silent' ? 0.34 : visualMode === 'focus' ? 0.62 : 1;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particleCount} args={[positions, 3]} />
          <bufferAttribute attach="attributes-aInitialPos" count={particleCount} args={[initialPositions, 3]} />
          <bufferAttribute attach="attributes-aRandom" count={particleCount} args={[randoms, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={particleVertexShader}
          fragmentShader={particleFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <RingShip impactsRef={impactSlots} ringTimeRef={localTime} shipPositionRef={shipPositionRef} />
      <MeteorImpact impactQueueRef={impactQueueRef} manualMeteorQueueRef={manualMeteorQueueRef} protectedPositionRef={shipPositionRef} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handleManualMeteor}
      >
        <circleGeometry args={[13.2, 96]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
};
