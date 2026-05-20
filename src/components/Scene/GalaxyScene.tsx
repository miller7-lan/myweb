import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { SaturnCore } from './SaturnCore';
import { ParticleRing } from './ParticleRing';
import { ThemePlanet } from './ThemePlanet';
import { BackgroundStars } from './BackgroundStars';
import { LockBeam } from './LockBeam';
import { themes } from '../../data/themes';
import { useGalaxyStore } from '../../store/useGalaxyStore';

export const GalaxyScene: React.FC = () => {
  const mousePos = useRef(new THREE.Vector3(0, 0, 0));
  const mouseScreenPos = useRef(new THREE.Vector2(0, 0));
  const { camera, size } = useThree();
  const { viewState } = useGalaxyStore();
  const galaxyGroup = useRef<THREE.Group>(null);
  
  // Animation state ref
  const introState = useRef({ progress: 0 });
  const planetsGroup = useRef<THREE.Group>(null);

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
    // Handle fading of core and rings when entering/leaving theme
    if (!galaxyGroup.current) return;
    
    // Core and Rings are the first two children typically, or we can just animate opacity
    // if we added opacity props, but we didn't hook them to materials perfectly.
    // Instead, we can scale the whole group or fade it if we added a global uniform.
    // For now, let's scale down the core and ring group when active.
    
    const isTheme = viewState === 'ENTERING_THEME' || viewState === 'THEME';
    
    gsap.to(galaxyGroup.current.scale, {
      x: isTheme ? 0.01 : 1,
      y: isTheme ? 0.01 : 1,
      z: isTheme ? 0.01 : 1,
      duration: isTheme ? 0.8 : 1.2,
      ease: isTheme ? 'power2.in' : 'power4.out',
      overwrite: 'auto'
    });
    
  }, [viewState]);

  useFrame((state) => {
    mouseScreenPos.current.copy(state.mouse);

    // Raycast mouse to a plane to get 3D coordinates for light
    const vec = new THREE.Vector3(state.mouse.x, state.mouse.y, 0.5);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const targetPos = camera.position.clone().add(dir.multiplyScalar(distance));
    
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
          />
        ))}
      </group>
    </>
  );
};
