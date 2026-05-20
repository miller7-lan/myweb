import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { particleVertexShader, particleFragmentShader } from '../../shaders/particles';
import type { ThemeDef } from '../../data/themes';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import gsap from 'gsap';
import { createSeededRandom } from '../../utils/random';

interface ThemePlanetProps {
  themeDef: ThemeDef;
  mousePosRef: React.RefObject<THREE.Vector3>;
  mouseScreenPosRef: React.RefObject<THREE.Vector2>;
  screenAspect: number;
}

export const ThemePlanet: React.FC<ThemePlanetProps> = ({ themeDef, mousePosRef, mouseScreenPosRef, screenAspect }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const coreGlowRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { viewState, hoveredPlanet, visitedThemes, lastVisitedTheme, visualMode, setHoveredPlanet, activeTheme, setViewState, setActiveTheme, setPlanetPosition } = useGalaxyStore();
  
  const isHovered = hoveredPlanet === themeDef.key;
  const isActive = activeTheme === themeDef.key;
  const themeKey = themeDef.key as Exclude<typeof themeDef.key, null>;
  const isVisited = Boolean(visitedThemes[themeKey]);
  const isLastVisited = lastVisitedTheme === themeDef.key && viewState === 'HOME';
  // "Focused" = this planet is selected or entering; treat same as hovered for color/bubble.
  const isFocused = isActive && (viewState === 'ENTERING_THEME' || viewState === 'THEME');
  
  const isReturning = useRef(false);
  const returnProgress = useRef({ value: 0 });
  const returnStartPosition = useRef(new THREE.Vector3(0, 5, 15));
  const hasStartedEnterAnimation = useRef(false);
  
  // Base properties
  const particleCount = 1800;
  const baseRadius = 0.55;
  const ringTilt = Math.PI * 0.12; // Must match ParticleRing tilt
  const haloDefaultTilt = Math.PI / 2.15;
  const haloHoverTilt = haloDefaultTilt + Math.sin(themeDef.orbitOffset + 0.7) * 0.55;
  const haloHoverYaw = Math.cos(themeDef.orbitOffset + 0.35) * 0.48;
  const shapeProfile = {
    identity: { haloRadius: 0.9, haloTube: 0.012, glowRadius: 0.68, glowIdle: 0.06, glowHover: 0.24 },
    creations: { haloRadius: 1.02, haloTube: 0.016, glowRadius: 0.74, glowIdle: 0.05, glowHover: 0.22 },
    stack: { haloRadius: 0.96, haloTube: 0.011, glowRadius: 0.7, glowIdle: 0.055, glowHover: 0.2 },
    orbit: { haloRadius: 1.05, haloTube: 0.014, glowRadius: 0.72, glowIdle: 0.05, glowHover: 0.21 },
    signal: { haloRadius: 0.94, haloTube: 0.018, glowRadius: 0.76, glowIdle: 0.065, glowHover: 0.26 },
  }[String(themeDef.key)] ?? { haloRadius: 0.94, haloTube: 0.014, glowRadius: 0.72, glowIdle: 0.045, glowHover: 0.2 };

  const [positions, randoms, initialPositions] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const rnd = new Float32Array(particleCount);
    const initPos = new Float32Array(particleCount * 3);
    const random = createSeededRandom(themeDef.orbitOffset * 10000 + particleCount);

    for (let i = 0; i < particleCount; i++) {
      const u = random();
      const v = random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      // Make it a dense solid shell rather than a dispersed cloud
      const r = random() > 0.15 
        ? baseRadius * (0.95 + random() * 0.05) 
        : baseRadius * Math.cbrt(random());
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      rnd[i] = random();

      initPos[i * 3] = (random() - 0.5) * 80;
      initPos[i * 3 + 1] = (random() - 0.5) * 80;
      initPos[i * 3 + 2] = (random() - 0.5) * 80 - 10;
    }
    return [pos, rnd, initPos];
  }, [baseRadius, themeDef.orbitOffset]);

  // Handle click animation
  const handleClick = () => {
    if (viewState !== 'HOME' && viewState !== 'HOVER_PLANET') return;
    
    // Switch state to block other interactions
    setViewState('ENTERING_THEME');
    setActiveTheme(themeDef.key);
  };

  // Handle entry animation when state changes to ENTERING_THEME
  useEffect(() => {
    if (viewState === 'ENTERING_THEME' && isActive && !hasStartedEnterAnimation.current) {
      hasStartedEnterAnimation.current = true;
      const tl = gsap.timeline({
        onComplete: () => {
          setViewState('THEME');
        }
      });

      if (groupRef.current && materialRef.current) {
        if (pointsRef.current) {
          pointsRef.current.visible = true;
        }

        // Stage 1: Press feedback
        tl.to(groupRef.current.scale, {
          x: 0.94, y: 0.94, z: 0.94,
          duration: 0.12,
          ease: 'power2.out'
        });

        // Stage 2: Break from orbit & push to camera
        tl.to(groupRef.current.position, {
          x: 0, y: 5, z: 15,
          duration: 0.8,
          ease: 'power4.out'
        }, "+=0.05");

        // Stage 3 & 4: Expand aggressively
        tl.to(groupRef.current.scale, {
          x: 15, y: 15, z: 15,
          duration: 1.0,
          ease: 'expo.out'
        }, "-=0.6");

        tl.to(materialRef.current.uniforms.uParticleSize, {
          value: 12.0,
          duration: 0.8,
          ease: 'power2.out'
        }, "-=0.8");
      }
    }

    if (viewState === 'HOME') {
      hasStartedEnterAnimation.current = false;
      if (pointsRef.current) {
        pointsRef.current.visible = true;
      }
      if (materialRef.current) {
        gsap.set(materialRef.current.uniforms.uOpacity, { value: 1.0 });
      }
    }

    if (viewState === 'THEME' && isActive && pointsRef.current) {
      pointsRef.current.visible = false;
    }
  }, [viewState, isActive, setViewState]);

  // Handle return animation
  useEffect(() => {
    if (viewState === 'LEAVING_THEME' && isActive) {
      const tl = gsap.timeline({
        overwrite: 'auto',
        onComplete: () => {
          setViewState('HOME');
          setActiveTheme(null);
        }
      });

      if (groupRef.current && materialRef.current) {
        gsap.killTweensOf(groupRef.current.position);
        gsap.killTweensOf(groupRef.current.scale);
        gsap.killTweensOf(materialRef.current.uniforms.uParticleSize);
        gsap.killTweensOf(materialRef.current.uniforms.uHoverBrightness);
        gsap.killTweensOf(materialRef.current.uniforms.uOpacity);

        returnStartPosition.current.copy(groupRef.current.position);
        gsap.set(materialRef.current.uniforms.uParticleSize, { value: 3.2 });
        gsap.set(materialRef.current.uniforms.uHoverBrightness, { value: 0.0 });
        gsap.set(materialRef.current.uniforms.uOpacity, { value: 0.0 });
        gsap.set(groupRef.current.scale, { x: 2.2, y: 2.2, z: 2.2 });
        if (pointsRef.current) {
          pointsRef.current.visible = true;
        }

        // Step 1: Bring the returning particles back under the fading overlay.
        tl.to(materialRef.current.uniforms.uOpacity, {
          value: 1.0,
          duration: 0.28,
          ease: 'power2.out',
          overwrite: 'auto'
        }, 0.04);

        // Step 2: Keep particle pixels light while the planet returns.
        tl.to(materialRef.current.uniforms.uParticleSize, {
          value: 4.0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto'
        }, 0);

        // Step 3: Contract scale back to normal, overlapping the position blend.
        tl.to(groupRef.current.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.8,
          ease: 'power3.out',
          overwrite: 'auto'
        }, 0);

        // Step 4: Revert planet color to default grey when returning
        const defaultColor = new THREE.Color('#a0a0ab');
        tl.to(materialRef.current.uniforms.uColor.value, {
          r: defaultColor.r,
          g: defaultColor.g,
          b: defaultColor.b,
          duration: 0.4,
          ease: 'power2.out'
        }, 0);

        tl.to(materialRef.current.uniforms.uGlowColor.value, {
          r: defaultColor.r,
          g: defaultColor.g,
          b: defaultColor.b,
          duration: 0.4,
          ease: 'power2.out'
        }, 0);

        // Step 5: Blend position from its actual expanded position back to orbit.
        isReturning.current = true;
        returnProgress.current.value = 0;
        tl.to(returnProgress.current, {
          value: 1,
          duration: 0.8,
          ease: 'power3.out',
          overwrite: 'auto',
          onComplete: () => {
            isReturning.current = false;
          }
        }, 0);
      }
    }
  }, [viewState, isActive, setViewState, setActiveTheme]);

  // Hover / focus color animations
  useEffect(() => {
    if (!groupRef.current || viewState === 'LEAVING_THEME') return;

    const highlighted = isHovered || isFocused;

    // Don't mess with scale during entry animation
    if (viewState !== 'ENTERING_THEME' && viewState !== 'THEME') {
      gsap.to(groupRef.current.scale, {
        x: highlighted ? 1.1 : 1,
        y: highlighted ? 1.1 : 1,
        z: highlighted ? 1.1 : 1,
        duration: highlighted ? 0.42 : 1.25,
        ease: highlighted ? 'power3.out' : 'power2.out'
      });
    }
    
    if (materialRef.current) {
      gsap.to(materialRef.current.uniforms.uHoverBrightness, {
        value: highlighted ? 0.44 : 0.0,
        duration: highlighted ? 0.28 : 1.35,
        ease: highlighted ? 'power2.out' : 'power2.inOut'
      });
      
      const targetColor = highlighted ? new THREE.Color(themeDef.color) : new THREE.Color('#a0a0ab');
      gsap.to(materialRef.current.uniforms.uColor.value, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: highlighted ? 0.24 : 1.1,
        ease: highlighted ? 'power2.out' : 'power2.inOut'
      });

      gsap.to(materialRef.current.uniforms.uGlowColor.value, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: highlighted ? 0.24 : 1.1,
        ease: highlighted ? 'power2.out' : 'power2.inOut'
      });
    }

  }, [isHovered, isFocused, viewState, themeDef.color]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMousePos: { value: new THREE.Vector3() },
    uMouseScreenPos: { value: new THREE.Vector2() },
    uAspect: { value: 1 },
    uParticleSize: { value: 4.0 },
    uColor: { value: new THREE.Color('#a0a0ab') },
    uGlowColor: { value: new THREE.Color('#a0a0ab') },
    uHoverBrightness: { value: 0.0 },
    uOpacity: { value: 1.0 },
    uIntroProgress: { value: 0.0 },
    uImpactPoint: { value: new THREE.Vector3() },
    uImpactStartTime: { value: -999 },
    uImpactStrength: { value: 0.0 },
    uImpactRadius: { value: 1.0 }
  }), []);

  const localTime = useRef(0);
  const haloTime = useRef(0);
  const haloSpin = useRef(0);
  const haloScaleRef = useRef(0.92);
  const coreScaleRef = useRef(0.74);

  useFrame((_, delta) => {
    const shouldPauseOrbit = Boolean(hoveredPlanet) && viewState !== 'ENTERING_THEME' && viewState !== 'LEAVING_THEME';
    const highlighted = isHovered || isFocused;
    const motionScale = visualMode === 'silent' ? 0.16 : visualMode === 'focus' ? 0.48 : 1;
    const haloMotionScale = visualMode === 'silent' ? 0.2 : visualMode === 'focus' ? 0.55 : 1;

    if (viewState !== 'THEME' && !shouldPauseOrbit) {
      localTime.current += delta * motionScale;
      
      if (pointsRef.current) {
        pointsRef.current.rotation.y -= delta * motionScale * 0.9; // Planet own rotation
      }
    }

    if (haloRef.current) {
      haloTime.current += delta * haloMotionScale;
      const wobble = highlighted && viewState !== 'THEME' ? 1 : 0;
      const nonlinearSpeed = highlighted
        ? 1.25 + (Math.sin(haloTime.current * 1.7 + themeDef.orbitOffset) + 1) * 0.55
        : 0.55;
      haloSpin.current += delta * haloMotionScale * nonlinearSpeed;

      if (highlighted) {
        const roll = haloSpin.current + themeDef.orbitOffset;
        haloRef.current.rotation.x =
          haloHoverTilt +
          Math.sin(roll * 0.78) * 0.62 +
          Math.cos(roll * 1.37) * 0.22;
        haloRef.current.rotation.y = haloHoverYaw + roll;
      } else {
        haloRef.current.rotation.x = THREE.MathUtils.lerp(
          haloRef.current.rotation.x,
          haloDefaultTilt,
          0.08
        );
        haloRef.current.rotation.y = THREE.MathUtils.lerp(
          haloRef.current.rotation.y,
          0,
          0.08
        );
      }

      haloRef.current.rotation.z += delta * (0.8 + wobble * (0.9 + Math.cos(haloTime.current * 2.2) * 0.32));
      const haloScale = highlighted
        ? 1.08 + Math.sin(haloTime.current * 4) * 0.04
        : isLastVisited
          ? 1.02 + Math.sin(haloTime.current * 5.2) * 0.03
          : isVisited
            ? 0.97
            : 0.92;
      haloScaleRef.current = THREE.MathUtils.lerp(
        haloScaleRef.current,
        haloScale,
        highlighted ? 0.12 : 0.024
      );
      haloRef.current.scale.setScalar(haloScaleRef.current);
    }

    if (coreGlowRef.current) {
      const coreScale = highlighted
        ? 1.0 + Math.sin(haloTime.current * 3.4 + themeDef.orbitOffset) * 0.06
        : isLastVisited
          ? 0.9 + Math.sin(haloTime.current * 4.8 + themeDef.orbitOffset) * 0.05
          : isVisited
            ? 0.8
            : 0.74;
      coreScaleRef.current = THREE.MathUtils.lerp(
        coreScaleRef.current,
        coreScale,
        highlighted ? 0.12 : 0.026
      );
      coreGlowRef.current.scale.setScalar(coreScaleRef.current);
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = localTime.current;
      materialRef.current.uniforms.uMousePos.value.copy(mousePosRef.current);
      materialRef.current.uniforms.uMouseScreenPos.value.copy(mouseScreenPosRef.current);
      materialRef.current.uniforms.uAspect.value = screenAspect;
      if (viewState === 'HOME' || viewState === 'HOVER_PLANET') {
        materialRef.current.uniforms.uParticleSize.value = visualMode === 'silent' ? 3.0 : visualMode === 'focus' ? 3.45 : 4.0;
        materialRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(
          materialRef.current.uniforms.uOpacity.value,
          visualMode === 'silent' ? 0.56 : visualMode === 'focus' ? 0.74 : 1,
          0.08
        );
      }
    }

    // Calculate dynamic orbit position based on local time
    const angle = localTime.current * themeDef.orbitSpeed + themeDef.orbitOffset;
    const x = Math.cos(angle) * themeDef.orbitRadius;
    const z = Math.sin(angle) * themeDef.orbitRadius;
    const y = 0; // Perfectly intersect the ring plane

    // Apply tilt around X axis (match ParticleRing rotation.x)
    const cosT = Math.cos(ringTilt);
    const sinT = Math.sin(ringTilt);
    
    const newY = y * cosT - z * sinT;
    const newZ = y * sinT + z * cosT;
    const orbitPos = new THREE.Vector3(x, newY, newZ);

    if (groupRef.current) {
      if (viewState === 'HOME' || viewState === 'HOVER_PLANET') {
        groupRef.current.position.copy(orbitPos);
      } else if (isReturning.current) {
        // Smoothly blend from the expanded position back to the moving orbit.
        groupRef.current.position.lerpVectors(returnStartPosition.current, orbitPos, returnProgress.current.value);
      } else if (viewState === 'LEAVING_THEME' && !isActive) {
        groupRef.current.position.copy(orbitPos);
      }

      if (themeDef.key) {
        const { x: px, y: py, z: pz } = groupRef.current.position;
        setPlanetPosition(themeDef.key, [px, py, pz]);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Invisible sphere for raycasting hit area. Keep it tight so focus feels intentional. */}
      <mesh 
        onPointerOver={(e) => {
          e.stopPropagation();
          if (viewState === 'HOME' || viewState === 'HOVER_PLANET') {
            setHoveredPlanet(themeDef.key);
            setViewState('HOVER_PLANET');
          }
        }}
        onPointerOut={() => {
          if (hoveredPlanet === themeDef.key) {
            setHoveredPlanet(null);
            if (viewState === 'HOVER_PLANET') setViewState('HOME');
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        <sphereGeometry args={[1.35, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      
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

      <mesh ref={coreGlowRef} visible={viewState !== 'THEME'}>
        <sphereGeometry args={[shapeProfile.glowRadius, 32, 32]} />
        <meshBasicMaterial
          color={themeDef.color}
          transparent
          opacity={(isHovered || isFocused ? shapeProfile.glowHover : isLastVisited ? shapeProfile.glowHover * 0.72 : isVisited ? shapeProfile.glowIdle * 1.35 : shapeProfile.glowIdle) * (visualMode === 'silent' ? 0.36 : visualMode === 'focus' ? 0.64 : 1)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={haloRef} rotation={[haloDefaultTilt, 0, 0]} visible={viewState !== 'THEME'}>
        <torusGeometry args={[shapeProfile.haloRadius, shapeProfile.haloTube, 10, 96]} />
        <meshBasicMaterial
          color={themeDef.color}
          transparent
          opacity={(isHovered || isFocused ? 0.46 : isLastVisited ? 0.34 : isVisited ? 0.2 : 0.12) * (visualMode === 'silent' ? 0.35 : visualMode === 'focus' ? 0.62 : 1)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <Html
        position={[0, 2.0, 0]}
        center
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`
            flex flex-col items-center justify-center
            px-5 py-2.5 rounded-2xl backdrop-blur-xl border border-white/10
            bg-[#0a0a0f]/60 text-gray-200 transition-all duration-300 ease-out
            ${(isHovered || isFocused) && viewState !== 'THEME' 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-4 scale-90'}
          `}
          style={{
            boxShadow: `0 4px 30px ${themeDef.color}30`,
          }}
        >
          <span 
            className="text-xs font-bold tracking-[0.2em] uppercase mb-0.5 flex items-center gap-2"
            style={{ color: themeDef.color, textShadow: `0 0 12px ${themeDef.color}` }}
          >
            <span>{themeDef.title}</span>
            <span className="opacity-50 text-[10px] font-normal tracking-widest">|</span>
            <span className="tracking-widest">{themeDef.chineseName}</span>
          </span>
          <span className="text-[10px] text-gray-400 tracking-wider whitespace-nowrap">
            {themeDef.subtitle}
          </span>
        </div>
      </Html>
    </group>
  );
};
