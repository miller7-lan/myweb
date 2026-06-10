import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { SaturnCore } from './SaturnCore';
import { ParticleRing } from './ParticleRing';
import { ThemePlanet } from './ThemePlanet';
import { BackgroundStars } from './BackgroundStars';
import { LockBeam } from './LockBeam';
import { ConstellationFireworks } from './ConstellationFireworks';
import { themes } from '../../data/themes';
import { useGalaxyStore } from '../../store/useGalaxyStore';

export const GalaxyScene: React.FC = () => {
  const mousePos = useRef(new THREE.Vector3(0, 0, 0));
  const mouseScreenPos = useRef(new THREE.Vector2(0, 0));
  const { camera, size } = useThree();
  const { viewState } = useGalaxyStore();
  const isMobilePortrait = size.width <= 768 && size.height > size.width;
  const galaxyGroup = useRef<THREE.Group>(null);
  const introState = useRef({ progress: 0 });
  const layoutProgress = useRef({ value: isMobilePortrait ? 1 : 0 });
  const planetsGroup = useRef<THREE.Group>(null);
  const pointerVector = useRef(new THREE.Vector3());
  const pointerTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    // Intro aggregation animation
    gsap.to(introState.current, {
      progress: 1,
      duration: 2.0,
      ease: 'expo.out',
      onUpdate: () => {
        const updateUniforms = (group: THREE.Group) => {
          group.traverse((child) => {
            if (child instanceof THREE.Points && child.material instanceof THREE.ShaderMaterial) {
              if (child.material.uniforms.uIntroProgress) {
                child.material.uniforms.uIntroProgress.value = introState.current.progress;
              }
            }
          });
        };
        
        if (galaxyGroup.current) updateUniforms(galaxyGroup.current);
        if (planetsGroup.current) updateUniforms(planetsGroup.current);
      }
    });
  }, []);

  useEffect(() => {
    if (!galaxyGroup.current) return;

    const isTheme = viewState === 'ENTERING_THEME' || viewState === 'THEME';
    const homeScale = isMobilePortrait ? 0.36 : 1;
    
    gsap.to(galaxyGroup.current.scale, {
      x: isTheme ? 0.01 : homeScale,
      y: isTheme ? 0.01 : homeScale,
      z: isTheme ? 0.01 : homeScale,
      duration: isTheme ? 0.8 : 1.2,
      ease: isTheme ? 'power2.in' : 'power4.out',
      overwrite: 'auto'
    });

    gsap.to(galaxyGroup.current.position, {
      y: !isTheme && isMobilePortrait ? -0.82 : 0,
      duration: 1.0,
      ease: 'power3.out',
      overwrite: 'auto',
    });
    
  }, [isMobilePortrait, viewState]);

  useEffect(() => {
    gsap.to(layoutProgress.current, {
      value: isMobilePortrait ? 1 : 0,
      duration: isMobilePortrait ? 0.72 : 1.0,
      ease: isMobilePortrait ? 'power3.out' : 'power4.inOut',
      overwrite: 'auto',
    });
  }, [isMobilePortrait]);

  useFrame((state) => {
    mouseScreenPos.current.copy(state.mouse);

    // Raycast mouse to a plane to get 3D coordinates for light
    const vec = pointerVector.current.set(state.mouse.x, state.mouse.y, 0.5);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const targetPos = pointerTarget.current.copy(camera.position).add(dir.multiplyScalar(distance));
    
    // Smooth lerp mouse light position
    mousePos.current.lerp(targetPos, 0.1);
  });

  return (
    <>
      <BackgroundStars />
      
      {/* Galaxy Core & Rings */}
      <group ref={galaxyGroup}>
        <SaturnCore
          mousePosRef={mousePos}
          mouseScreenPosRef={mouseScreenPos}
          screenAspect={size.width / size.height}
        />
        <ParticleRing
          mousePosRef={mousePos}
          mouseScreenPosRef={mouseScreenPos}
          screenAspect={size.width / size.height}
        />
        <ConstellationFireworks isMobilePortrait={isMobilePortrait} />
      </group>
      
      {/* Planets are outside galaxyGroup so they don't fade/shrink with it */}
      <group ref={planetsGroup}>
        <LockBeam />
        {Object.values(themes).map(theme => (
          <ThemePlanet 
            key={theme.key} 
            themeDef={theme} 
            mousePosRef={mousePos}
            mouseScreenPosRef={mouseScreenPos}
            screenAspect={size.width / size.height}
            isMobilePortrait={isMobilePortrait}
            layoutProgressRef={layoutProgress}
          />
        ))}
      </group>
    </>
  );
};
