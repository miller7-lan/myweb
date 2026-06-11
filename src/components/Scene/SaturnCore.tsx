import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { particleVertexShader, particleFragmentShader } from '../../shaders/particles';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { themes } from '../../data/themes';
import { createSeededRandom } from '../../utils/random';

interface SaturnCoreProps {
  mousePosRef: React.RefObject<THREE.Vector3>;
  mouseScreenPosRef: React.RefObject<THREE.Vector2>;
  screenAspect: number;
  isMobilePortrait: boolean;
}

export const SaturnCore: React.FC<SaturnCoreProps> = ({ mousePosRef, mouseScreenPosRef, screenAspect, isMobilePortrait }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewState, hoveredPlanet, visitedThemes, completionPulseId, visualMode, triggerCoreFirework } = useGalaxyStore();
  const [completionGlow, setCompletionGlow] = useState(false);
  const isVisible = viewState === 'HOME' || viewState === 'HOVER_PLANET';
  const canTriggerFirework = isVisible && visualMode !== 'silent';
  const isComplete = Object.values(visitedThemes).filter(Boolean).length === 5;
  const lockedColor = completionGlow ? '#f8fafc' : hoveredPlanet ? themes[hoveredPlanet].color : '#e2e8f0';
  const shownCompletionPulseId = useRef(0);

  const particleCount = 6000;
  
  const [positions, randoms, initialPositions] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const rnd = new Float32Array(particleCount);
    const initPos = new Float32Array(particleCount * 3);
    const random = createSeededRandom(6000);
    
    for (let i = 0; i < particleCount; i++) {
      const u = random();
      const v = random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      const layerRand = random();
      let radius;
      if (layerRand < 0.5) {
        // Core layer (denser)
        radius = 1.8 * Math.pow(random(), 0.5);
      } else if (layerRand < 0.85) {
        // Surface layer
        radius = 1.8 + random() * 0.4;
      } else {
        // Sparse dust layer
        radius = 2.2 + random() * 1.5;
      }
      
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
      
      rnd[i] = random();

      // Scattered initial positions
      initPos[i * 3] = (random() - 0.5) * 100;
      initPos[i * 3 + 1] = (random() - 0.5) * 100;
      initPos[i * 3 + 2] = (random() - 0.5) * 100 - 20;
    }
    return [pos, rnd, initPos];
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMousePos: { value: new THREE.Vector3() },
    uMouseScreenPos: { value: new THREE.Vector2() },
    uAspect: { value: 1 },
    uParticleSize: { value: 4.5 },
    uColor: { value: new THREE.Color('#a0a0ab') }, // Match planets
    uGlowColor: { value: new THREE.Color('#aeb7c8') },
    uHoverBrightness: { value: 0.0 },
    uIsHovered: { value: 0.0 },
    uOpacity: { value: 1.0 },
    uIntroProgress: { value: 0.0 },
    uImpactPoint: { value: new THREE.Vector3() },
    uImpactStartTime: { value: -999 },
    uImpactStrength: { value: 0.0 },
    uImpactRadius: { value: 1.0 }
  }), []);

  const localTime = useRef(0);

  useEffect(() => {
    if (completionPulseId <= 0 || !isComplete || !isVisible) return;
    if (shownCompletionPulseId.current === completionPulseId) return;

    shownCompletionPulseId.current = completionPulseId;
    setCompletionGlow(true);
    const timer = window.setTimeout(() => setCompletionGlow(false), 4200);
    return () => window.clearTimeout(timer);
  }, [completionPulseId, isComplete, isVisible]);

  useFrame((_, delta) => {
    const isLockingPlanet = Boolean(hoveredPlanet) && (viewState === 'HOME' || viewState === 'HOVER_PLANET');
    const motionScale = visualMode === 'silent' ? 0.12 : visualMode === 'focus' ? 0.42 : 1;
    const opacityBase = visualMode === 'silent' ? 0.46 : visualMode === 'focus' ? 0.72 : 1;
    const coreParticleSize = isMobilePortrait
      ? visualMode === 'silent' ? 1.02 : visualMode === 'focus' ? 1.22 : 1.42
      : visualMode === 'silent' ? 3.2 : visualMode === 'focus' ? 3.8 : 4.5;
    const mobileOpacityScale = isMobilePortrait ? 0.82 : 1;

    if (viewState !== 'THEME') {
      localTime.current += delta * motionScale;
      if (pointsRef.current) {
        pointsRef.current.rotation.y -= delta * motionScale * (isLockingPlanet ? 0.09 : 0.18); // Counter-clockwise rotation
      }
    }
    
    if (pointsRef.current) {
      pointsRef.current.rotation.z = 0.1; // Slight tilt
    }
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = localTime.current;
      materialRef.current.uniforms.uMousePos.value.copy(mousePosRef.current);
      materialRef.current.uniforms.uMouseScreenPos.value.copy(mouseScreenPosRef.current);
      materialRef.current.uniforms.uAspect.value = screenAspect;
      materialRef.current.uniforms.uParticleSize.value = coreParticleSize;
      materialRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uOpacity.value,
        (isLockingPlanet ? 0.58 : 1.0) * opacityBase * mobileOpacityScale,
        0.08
      );
      // Removed opacity overwrite here because we use AdditiveBlending and don't natively support opacity on ShaderMaterial this way without another uniform, but keeping structure valid
    }

    if (groupRef.current) {
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, isLockingPlanet ? 0.92 : 1, 0.08));
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

      <Html
        position={[0, 0.12, 0]}
        center
        zIndexRange={[100, 0]}
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      >
        <button
          type="button"
          onClick={() => {
            if (canTriggerFirework) triggerCoreFirework();
          }}
          disabled={!canTriggerFirework}
          aria-label="触发 Dazzle 星座烟花"
          className={`flex flex-col items-center justify-center rounded-full border px-6 py-2.5 text-gray-200 backdrop-blur-sm transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          } ${canTriggerFirework ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}`}
          style={{
            background: completionGlow
              ? 'radial-gradient(circle at center, rgba(248,250,252,0.22), rgba(248,113,113,0.12) 22%, rgba(147,197,253,0.12) 42%, rgba(196,181,253,0.1) 62%, rgba(2,2,4,0.22) 82%)'
              : `radial-gradient(circle at center, ${lockedColor}22, rgba(8,10,14,0.54) 42%, rgba(2,2,4,0.22) 78%)`,
            borderColor: completionGlow ? 'rgba(248,250,252,0.46)' : hoveredPlanet ? `${lockedColor}55` : 'rgba(226, 232, 240, 0.18)',
            boxShadow: completionGlow
              ? 'inset 0 0 28px rgba(248,250,252,0.18), 0 0 42px rgba(248,250,252,0.24), 0 0 72px rgba(196,181,253,0.16)'
              : `inset 0 0 24px ${lockedColor}18, 0 0 24px ${lockedColor}20`,
          }}
        >
          <span 
            className="text-xs md:text-sm font-semibold tracking-[0.28em] uppercase"
            style={{ color: completionGlow || hoveredPlanet ? lockedColor : '#eef2f8', textShadow: `0 0 12px ${lockedColor}88` }}
          >
            Dazzle
          </span>
        </button>
      </Html>
    </group>
  );
};
