import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { createSeededRandom } from '../../utils/random';

export const BackgroundStars: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particleCount = 200;

  const [positions, opacities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const op = new Float32Array(particleCount);
    const random = createSeededRandom(200);
    
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (random() - 0.5) * 100;
      pos[i * 3 + 1] = (random() - 0.5) * 100;
      pos[i * 3 + 2] = (random() - 0.5) * 50 - 30; // Push back
      
      op[i] = random() * 0.3 + 0.1; // Low brightness
    }
    return [pos, op];
  }, []);

  const { viewState } = useGalaxyStore();

  useFrame(() => {
    if (viewState === 'THEME') return;
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0003; // Extremely slow drift
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} args={[positions, 3]} />
        <bufferAttribute attach="attributes-opacity" count={particleCount} args={[opacities, 1]} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.8} 
        color="#1a1a20" 
        transparent 
        opacity={0.3}
        sizeAttenuation 
        depthWrite={false}
      />
    </points>
  );
};
