import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { wormholePull, wormholeTintAt } from '../../utils/portal';
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
  const portal = useGalaxyStore((state) => state.portal);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uOpacity: { value: 0.8 },
    uTint: { value: new THREE.Color('#ffffff') },
    uTintMix: { value: 0 },
  }), []);

  useEffect(() => {
    if (materialRef.current) materialRef.current.uniforms.uOpacity.value = visualMode === 'silent' ? 0.28 : visualMode === 'focus' ? 0.58 : 0.8;
  }, [visualMode]);

  // The wormhole pulls the far stars in too; they drift back out on return.
  useEffect(() => {
    const points = pointsRef.current;
    const tint = materialRef.current?.uniforms;
    if (!points || !tint) return;
    if (portal?.kind === 'enter' && portal.style === 'wormhole') {
      // They take the chosen planet's colour as they are pulled in.
      tint.uTint.value.set(portal.color);
      gsap.to(tint.uTintMix, { value: 1, delay: wormholeTintAt(portal), duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(points.scale, {
        x: 0.02, y: 0.02, z: 0.02,
        delay: portal.timing.lead + portal.timing.summon + wormholePull.start + 0.15,
        duration: wormholePull.duration,
        ease: 'power1.in',
        overwrite: 'auto',
      });
    } else if (viewState === 'LEAVING_THEME' || viewState === 'HOME') {
      gsap.set(tint.uTintMix, { value: 0, overwrite: true });
      if (points.scale.x < 1) gsap.to(points.scale, { x: 1, y: 1, z: 1, duration: 1.4, ease: 'power3.out', overwrite: 'auto' });
    }
  }, [portal, viewState]);

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
        ref={materialRef}
        uniforms={uniforms}
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
          uniform vec3 uTint;
          uniform float uTintMix;
          varying float vOpacity;
          void main() {
            float radius = length(gl_PointCoord - 0.5);
            float glow = exp(-radius * radius * 18.0) * (1.0 - smoothstep(0.3, 0.5, radius));
            vec3 color = mix(vec3(0.55, 0.65, 0.85) * 1.3, uTint * 1.4, uTintMix);
            gl_FragColor = vec4(color, glow * vOpacity * uOpacity * (1.0 + uTintMix * 0.6));
          }
        `}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
