import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { particleVertexShader, particleFragmentShader } from '../../shaders/particles';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { createSeededRandom } from '../../utils/random';
import { MeteorImpact, type RingImpactEvent } from './MeteorImpact';

interface ParticleRingProps {
  mousePosRef: React.RefObject<THREE.Vector3>;
  mouseScreenPosRef: React.RefObject<THREE.Vector2>;
  screenAspect: number;
}

export const ParticleRing: React.FC<ParticleRingProps> = ({ mousePosRef, mouseScreenPosRef, screenAspect }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const impactRef = useRef<RingImpactEvent | null>(null);
  const lastImpactId = useRef(0);

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
    uImpactPoint: { value: new THREE.Vector3() },
    uImpactStartTime: { value: -999 },
    uImpactStrength: { value: 0.0 },
    uImpactRadius: { value: 6.8 }
  }), []);

  const { viewState } = useGalaxyStore();
  const localTime = useRef(0);

  useFrame((_, delta) => {
    if (viewState !== 'THEME') {
      localTime.current += delta;
      if (groupRef.current) {
        groupRef.current.rotation.y -= delta * 0.09; // Counter-clockwise ring rotation
      }
    }
    
    if (groupRef.current) {
      groupRef.current.rotation.x = Math.PI * 0.12; // Flat disc tilted 21 degrees
    }
    
    if (materialRef.current) {
      const pendingImpact = impactRef.current;
      if (pendingImpact && pendingImpact.id !== lastImpactId.current) {
        lastImpactId.current = pendingImpact.id;
        materialRef.current.uniforms.uImpactPoint.value.copy(pendingImpact.point);
        materialRef.current.uniforms.uImpactStartTime.value = localTime.current;
        materialRef.current.uniforms.uImpactStrength.value = pendingImpact.strength;
      }
      materialRef.current.uniforms.uTime.value = localTime.current;
      materialRef.current.uniforms.uMousePos.value.copy(mousePosRef.current);
      materialRef.current.uniforms.uMouseScreenPos.value.copy(mouseScreenPosRef.current);
      materialRef.current.uniforms.uAspect.value = screenAspect;
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
      <MeteorImpact impactRef={impactRef} />
    </group>
  );
};
