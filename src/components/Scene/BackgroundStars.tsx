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

  const { viewState, visualMode } = useGalaxyStore();

  useFrame((_, delta) => {
    if (viewState === 'THEME' || visualMode === 'silent') return;
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * (visualMode === 'focus' ? 0.0072 : 0.018);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} args={[positions, 3]} />
        <bufferAttribute attach="attributes-opacity" count={particleCount} args={[opacities, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={{ uOpacity: { value: visualMode === 'silent' ? 0.28 : visualMode === 'focus' ? 0.46 : 0.62 } }}
        vertexShader={`
          attribute float opacity;
          varying float vOpacity;
          void main() {
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = clamp((1.5 + opacity * 5.0) * 35.0 / max(1.0, -viewPosition.z), 1.0, 4.0);
            vOpacity = opacity;
          }
        `}
        fragmentShader={`
          uniform float uOpacity;
          varying float vOpacity;
          void main() {
            float radius = length(gl_PointCoord - 0.5);
            float glow = exp(-radius * radius * 18.0) * (1.0 - smoothstep(0.3, 0.5, radius));
            gl_FragColor = vec4(vec3(0.55, 0.65, 0.85), glow * vOpacity * uOpacity);
          }
        `}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
