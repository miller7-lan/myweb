import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { particleVertexShader, particleFragmentShader, particleSharedUniforms } from '../../shaders/particles';
import type { ThemeDef } from '../../data/themes';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import gsap from 'gsap';
import { createSeededRandom } from '../../utils/random';
import { createPlanetHaloGeometry } from './planetHaloGeometry';
import { makePortalPlan, tintParticles, wormholeTintAt, wormholePull } from '../../utils/portal';
import { raidTiming, raidTrack } from '../../utils/raid';

const planetRest = { color: '#a0a0ab', glow: '#a0a0ab' };

interface ThemePlanetProps {
  themeDef: ThemeDef;
  mousePosRef: React.RefObject<THREE.Vector3>;
  mouseScreenPosRef: React.RefObject<THREE.Vector2>;
  screenAspect: number;
  isMobilePortrait: boolean;
  layoutProgressRef: React.RefObject<{ value: number }>;
}

const portraitWheelCenterY = 4.48;
const portraitWheelRadiusX = 2.46;
const portraitWheelRadiusY = 2.62;
const portraitWheelSpeed = 0.36;

export const ThemePlanet: React.FC<ThemePlanetProps> = ({ themeDef, mousePosRef, mouseScreenPosRef, screenAspect, isMobilePortrait, layoutProgressRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const coreGlowRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const haloOrbitPhase = useRef(0);
  const reducedMotion = useRef(false);
  
  const { viewState, hoveredPlanet, visitedThemes, lastVisitedTheme, visualMode, setHoveredPlanet, activeTheme, setViewState, setActiveTheme, setPlanetPosition } = useGalaxyStore();
  
  const isHovered = hoveredPlanet === themeDef.key;
  const isActive = activeTheme === themeDef.key;
  const themeKey = themeDef.key as Exclude<typeof themeDef.key, null>;
  const isVisited = Boolean(visitedThemes[themeKey]);
  const isLastVisited = lastVisitedTheme === themeDef.key && viewState === 'HOME';
  // "Focused" = this planet is selected or entering; treat same as hovered for color/bubble.
  const isFocused = isActive && (viewState === 'ENTERING_THEME' || viewState === 'THEME');
  
  // The canvas renders on demand while a theme page is open (see App.tsx).
  const invalidate = useThree((state) => state.invalidate);
  const getThree = useThree((state) => state.get);
  const setPortal = useGalaxyStore((state) => state.setPortal);
  const introPlaying = useGalaxyStore((state) => state.introPlaying);
  const isReturning = useRef(false);
  const returnProgress = useRef({ value: 0 });
  const returnStartPosition = useRef(new THREE.Vector3(0, 5, 15));
  const hasStartedEnterAnimation = useRef(false);
  const wasHighlightedRef = useRef(false);
  
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
  const softenedThemeColor = useMemo(
    () => new THREE.Color(themeDef.color),
    [themeDef.color]
  );
  const softenedThemeHex = useMemo(() => `#${softenedThemeColor.getHexString()}`, [softenedThemeColor]);
  const idleGlowHex = '#a0a0ab';
  const haloGeometry = useMemo(
    () => createPlanetHaloGeometry(shapeProfile.haloRadius, shapeProfile.haloTube),
    [shapeProfile.haloRadius, shapeProfile.haloTube],
  );
  useEffect(() => () => haloGeometry.dispose(), [haloGeometry]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { reducedMotion.current = preference.matches; };
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);

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

  // Where this planet is on screen: centre and visible radius in CSS px.
  const screenPoint = (world: THREE.Vector3) => {
    const { camera, gl } = getThree();
    const group = groupRef.current;
    const radius = baseRadius * (group ? group.getWorldScale(new THREE.Vector3()).x : 1);
    const centre = world.clone().project(camera);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(Math.max(radius, 0.2));
    const edge = world.clone().add(right).project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    const toX = (ndc: number) => rect.left + ((ndc + 1) / 2) * rect.width;
    const toY = (ndc: number) => rect.top + ((1 - ndc) / 2) * rect.height;
    return { x: toX(centre.x), y: toY(centre.y), r: Math.max(14, Math.abs(toX(edge.x) - toX(centre.x))) };
  };

  // The galaxy's centre star on screen (GalaxyScene names its group).
  const corePoint = () => {
    const core = getThree().scene.getObjectByName('galaxy-core');
    if (!core) return null;
    const { camera, gl } = getThree();
    const world = core.getWorldPosition(new THREE.Vector3());
    const radius = 2.0 * core.getWorldScale(new THREE.Vector3()).x;
    const centre = world.clone().project(camera);
    const edge = world.clone().add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(radius)).project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    const toX = (ndc: number) => rect.left + ((ndc + 1) / 2) * rect.width;
    const toY = (ndc: number) => rect.top + ((1 - ndc) / 2) * rect.height;
    return { x: toX(centre.x), y: toY(centre.y), r: Math.abs(toX(edge.x) - toX(centre.x)) };
  };

  // Entering: the planet waits while 星仔 is summoned, then spins down into
  // the black hole (drawn by PortalTransition). Once the hole covers the
  // screen it takes the expanded, hidden spot the theme page expects.
  useEffect(() => {
    if (viewState === 'ENTERING_THEME' && isActive && !hasStartedEnterAnimation.current) {
      hasStartedEnterAnimation.current = true;
      const group = groupRef.current;
      const material = materialRef.current;
      if (!group || !material) {
        setViewState('THEME');
        return;
      }
      const plan = makePortalPlan('enter', screenPoint(group.getWorldPosition(new THREE.Vector3())), themeDef.color, corePoint());
      setPortal(plan);
      const { summon, swallow } = plan.timing;
      if (pointsRef.current) pointsRef.current.visible = true;
      gsap.killTweensOf(group.scale);

      const tl = gsap.timeline({
        onComplete: () => {
          // Hidden before the page renders, so the expanded planet never flashes through the reveal.
          if (pointsRef.current) pointsRef.current.visible = false;
          if (haloRef.current) haloRef.current.visible = false;
          if (coreGlowRef.current) coreGlowRef.current.visible = false;
          group.position.set(0, 5, 15);
          group.scale.setScalar(15);
          material.uniforms.uParticleSize.value = 12.0;
          setViewState('THEME');
        }
      });

      // Press feedback, then hold still while 星仔 arrives.
      tl.to(group.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 0.12, ease: 'power2.out' }, 0);
      tl.to(group.scale, { x: 1.24, y: 1.24, z: 1.24, duration: 0.3, ease: 'power2.out' }, 0.12);
      if (plan.style !== 'wormhole') {
        // A: swallowed, spinning up and shrinking to a point.
        if (pointsRef.current) {
          tl.to(pointsRef.current.rotation, { y: '-=7', duration: swallow * 0.7, ease: 'power2.in' }, summon);
        }
        tl.to(group.scale, { x: 0.001, y: 0.001, z: 0.001, duration: swallow * 0.55, ease: 'power3.in' }, summon + swallow * 0.12);
      }
      tl.to({}, { duration: 0 }, summon + swallow);
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
      invalidate();
    }
    // screenPoint only reads refs and the current camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState, isActive, setViewState, setPortal, invalidate, themeDef.color]);

  // Switching straight from one theme to another (bottom switcher) skips the
  // fly-out / fly-in: under the theme backdrop the old planet just drops back
  // into its orbit slot and the new one takes the expanded, hidden spot.
  const wasActiveRef = useRef(isActive);
  useEffect(() => {
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = isActive;
    if (viewState !== 'THEME' || wasActive === isActive) return;
    const group = groupRef.current;
    const material = materialRef.current;
    if (!group || !material) return;
    gsap.killTweensOf(group.position);
    gsap.killTweensOf(group.scale);
    gsap.killTweensOf(material.uniforms.uParticleSize);

    if (isActive) {
      hasStartedEnterAnimation.current = true;
      group.position.set(0, 5, 15);
      group.scale.setScalar(15);
      material.uniforms.uParticleSize.value = 12.0;
      if (pointsRef.current) pointsRef.current.visible = false;
    } else {
      hasStartedEnterAnimation.current = false;
      group.position.copy(blendedPositionRef.current);
      group.scale.setScalar(1);
      material.uniforms.uParticleSize.value = 4.0;
      if (pointsRef.current) pointsRef.current.visible = true;
    }
    // The canvas only renders on demand inside a theme; draw the swap once.
    invalidate();
  }, [isActive, viewState, invalidate]);

  // The wormhole pulls every planet into the black hole at the centre once
  // 星仔 has walked in; on the way back the others grow again in their orbits
  // (the chosen one has its own animation below).
  const portal = useGalaxyStore((state) => state.portal);
  useEffect(() => {
    const group = groupRef.current;
    if (!group || !portal) return;
    if (portal.kind === 'enter' && portal.style === 'wormhole' && viewState === 'ENTERING_THEME') {
      const core = getThree().scene.getObjectByName('galaxy-core');
      const target = core ? core.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
      const at = portal.timing.summon + wormholePull.start + 0.1 + themeDef.orbitOffset * 0.05;
      gsap.to(group.position, { x: target.x, y: target.y, z: target.z, delay: at, duration: wormholePull.duration * 0.75, ease: 'power2.in' });
      gsap.to(group.scale, { x: 0.001, y: 0.001, z: 0.001, delay: at, duration: wormholePull.duration * 0.75, ease: 'power2.in', overwrite: false });
      // Every planet takes the chosen planet's colour as it is pulled in; the
      // hover effect turns it back to grey on the way home.
      if (materialRef.current) tintParticles(materialRef.current.uniforms, portal.color, planetRest, wormholeTintAt(portal));
      invalidate();
    }
    if (portal.kind === 'leave' && viewState === 'LEAVING_THEME' && !isActive && group.scale.x < 0.5) {
      gsap.to(group.scale, { x: 1, y: 1, z: 1, delay: portal.timing.close + portal.timing.spit * 0.1, duration: portal.timing.spit * 0.8, ease: 'back.out(1.4)' });
    }
    // Runs once per plan; the rest only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal]);

  // Leaving: the page closes into this planet's spot in the galaxy, then
  // the black hole there spits the planet back out into its orbit.
  useEffect(() => {
    if (viewState === 'LEAVING_THEME' && isActive) {
      const group = groupRef.current;
      const material = materialRef.current;
      if (!group || !material) {
        setViewState('HOME');
        setActiveTheme(null);
        return;
      }
      gsap.killTweensOf(group.position);
      gsap.killTweensOf(group.scale);
      gsap.killTweensOf(material.uniforms.uParticleSize);
      gsap.killTweensOf(material.uniforms.uHoverBrightness);
      gsap.killTweensOf(material.uniforms.uOpacity);

      // Measure at normal size where the planet will reappear.
      group.position.copy(blendedPositionRef.current);
      group.scale.setScalar(1);
      group.updateMatrixWorld(true);
      const plan = makePortalPlan('leave', screenPoint(group.getWorldPosition(new THREE.Vector3())), themeDef.color, corePoint());
      setPortal(plan);
      const { close, spit } = plan.timing;

      const defaultColor = new THREE.Color('#a0a0ab');
      group.scale.setScalar(0.001);
      material.uniforms.uParticleSize.value = 4.0;
      material.uniforms.uHoverBrightness.value = 0.0;
      material.uniforms.uIsHovered.value = 0.0;
      material.uniforms.uOpacity.value = 0.82;
      material.uniforms.uColor.value.copy(defaultColor);
      material.uniforms.uGlowColor.value.copy(defaultColor);
      if (pointsRef.current) pointsRef.current.visible = true;

      // Follow the orbit while it grows back (see the frame loop).
      returnStartPosition.current.copy(blendedPositionRef.current);
      returnProgress.current.value = 1;
      isReturning.current = true;

      const tl = gsap.timeline({
        onComplete: () => {
          isReturning.current = false;
          setViewState('HOME');
          setActiveTheme(null);
        }
      });
      if (pointsRef.current) {
        tl.to(pointsRef.current.rotation, { y: '+=6', duration: spit * 0.8, ease: 'power3.out' }, close + spit * 0.12);
      }
      tl.to(group.scale, { x: 1, y: 1, z: 1, duration: spit * 0.75, ease: 'back.out(1.6)' }, close + spit * 0.12);
      tl.to({}, { duration: 0 }, close + spit);
    }
    // screenPoint only reads refs and the current camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState, isActive, setViewState, setActiveTheme, setPortal, themeDef.color]);

  // Hover / focus color animations
  useEffect(() => {
    if (!groupRef.current || viewState === 'LEAVING_THEME') return;

    const highlighted = isHovered || isFocused;
    const wasHighlighted = wasHighlightedRef.current;
    wasHighlightedRef.current = highlighted;

    // Don't mess with scale during entry animation
    if (viewState !== 'ENTERING_THEME' && viewState !== 'THEME') {
      gsap.killTweensOf(groupRef.current.scale);

      if (highlighted) {
        const currentScale = Math.max(groupRef.current.scale.x, 1);
        groupRef.current.scale.setScalar(currentScale);
        gsap.to(groupRef.current.scale, {
          x: 1.24,
          y: 1.24,
          z: 1.24,
          duration: 0.28,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      } else if (wasHighlighted) {
        gsap.to(groupRef.current.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.62,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    }
    
    if (materialRef.current) {
      gsap.killTweensOf(materialRef.current.uniforms.uHoverBrightness);
      gsap.killTweensOf(materialRef.current.uniforms.uColor.value);
      gsap.killTweensOf(materialRef.current.uniforms.uGlowColor.value);

      // Keep hover state instant so the shader can add themed brightness without losing pointer focus.
      materialRef.current.uniforms.uIsHovered.value = highlighted ? 1.0 : 0.0;
      
      const targetColor = highlighted ? softenedThemeColor.clone() : new THREE.Color('#a0a0ab');
      if (highlighted) {
        materialRef.current.uniforms.uColor.value.copy(targetColor);
        materialRef.current.uniforms.uGlowColor.value.copy(targetColor);
      }

      gsap.to(materialRef.current.uniforms.uHoverBrightness, {
        value: highlighted ? (visualMode === 'focus' ? 0.92 : 0.78) : 0.0,
        duration: highlighted ? 0.2 : 1.35,
        ease: highlighted ? 'power2.out' : 'power2.inOut',
        overwrite: 'auto',
      });

      if (!highlighted) {
        gsap.to(materialRef.current.uniforms.uColor.value, {
          r: targetColor.r,
          g: targetColor.g,
          b: targetColor.b,
          duration: 1.1,
          ease: 'power2.inOut',
          overwrite: 'auto',
        });

        gsap.to(materialRef.current.uniforms.uGlowColor.value, {
          r: targetColor.r,
          g: targetColor.g,
          b: targetColor.b,
          duration: 1.1,
          ease: 'power2.inOut',
          overwrite: 'auto',
        });
      }
    }

  }, [isHovered, isFocused, viewState, softenedThemeColor, visualMode]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMousePos: { value: new THREE.Vector3() },
    uMouseScreenPos: { value: new THREE.Vector2() },
    uAspect: { value: 1 },
    uParticleSize: { value: 4.0 },
    uColor: { value: new THREE.Color('#a0a0ab') },
    uGlowColor: { value: new THREE.Color('#a0a0ab') },
    uHoverBrightness: { value: 0.0 },
    uIsHovered: { value: 0.0 },
    uFocusBoost: { value: 0.0 },
    uOpacity: { value: 1.0 },
    uIntroProgress: { value: 0.0 },
    uImpactPoint: { value: new THREE.Vector3() },
    uImpactStartTime: { value: -999 },
    uImpactStrength: { value: 0.0 },
    uImpactRadius: { value: 1.0 },
    ...particleSharedUniforms(),
  }), []);

  // The UFO (utils/raid.ts): when it picks this planet, its particles are
  // pulled up the beam, then fall back and gather when 星仔 hits the UFO.
  const raid = useGalaxyStore((state) => state.raid);
  const raidOnMe = raid?.planet === themeDef.key ? raid : null;
  const suck = useRef({ value: 0 });
  // Where the UFO hovers, relative to the planet: it moves with it.
  const suckOffset = useRef(new THREE.Vector3());
  const raidFlash = useRef(0);
  const pulling = useRef(false);
  const suckWorld = useRef(new THREE.Vector3());
  const trackPoint = useRef(new THREE.Vector3());
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const state = suck.current;
    gsap.killTweensOf(state);
    if (!raidOnMe) {
      // Gone (or called off): let go of whatever was taken.
      if (state.value > 0) gsap.to(state, { value: 0, duration: 0.6, ease: 'power2.out' });
      return;
    }
    if (groupRef.current) suckOffset.current.fromArray(raidOnMe.hoverWorld).sub(groupRef.current.getWorldPosition(trackPoint.current));
    const t = raidTiming;
    // The beam pulls until the first star hits; the last one lets go.
    const pull = gsap.to(state, { value: 1, delay: t.suck, duration: t.firstHit - t.suck + 0.4, ease: 'power2.in' });
    const tl = gsap.timeline();
    pulling.current = true;
    tl.call(() => {
      pull.kill();
      pulling.current = false;
    }, undefined, t.firstHit)
      .to(state, { value: 0, duration: t.regather, ease: 'expo.out' }, t.lastHit);
    return () => {
      pull.kill();
      tl.kill();
      pulling.current = false;
    };
  }, [raidOnMe]);

  const localTime = useRef(0);
  const haloTime = useRef(0);
  const haloSpin = useRef(0);
  const haloScaleRef = useRef(0.92);
  const coreScaleRef = useRef(0.74);
  const orbitPositionRef = useRef(new THREE.Vector3());
  const portraitPositionRef = useRef(new THREE.Vector3());
  const blendedPositionRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const shouldPauseOrbit = Boolean(hoveredPlanet) && viewState !== 'ENTERING_THEME' && viewState !== 'LEAVING_THEME';
    const highlighted = isHovered || isFocused;
    const motionScale = visualMode === 'silent' ? 0.16 : visualMode === 'focus' ? 0.48 : 1;
    const haloMotionScale = visualMode === 'silent' ? 0.2 : visualMode === 'focus' ? 0.55 : 1;
    const portraitProgress = layoutProgressRef.current?.value ?? 0;
    const portraitMotionScale = THREE.MathUtils.lerp(1, 0.18, portraitProgress);

    // Planets hold still while a transition plays and only turn again once it has finished.
    if ((viewState === 'HOME' || viewState === 'HOVER_PLANET') && !shouldPauseOrbit && !introPlaying) {
      const ferrisMotionScale = THREE.MathUtils.lerp(motionScale, 0.82, portraitProgress);
      localTime.current += delta * ferrisMotionScale * portraitMotionScale;
      
      if (pointsRef.current) {
        pointsRef.current.rotation.y -= delta * motionScale * 0.9 * THREE.MathUtils.lerp(1, 0.7, portraitProgress); // Planet own rotation
      }
    }

    if (haloRef.current) {
      haloTime.current += delta * haloMotionScale * THREE.MathUtils.lerp(1, 0.46, portraitProgress);
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

      // Spin around the ring's own normal independently of its tilt/wobble.
      // The arrow shares this geometry, so it always travels with the dashes.
      if (viewState !== 'THEME' && !reducedMotion.current && visualMode !== 'silent') {
        const spinSpeed = (visualMode === 'focus' ? 0.3 : 0.55) * (highlighted ? 1.2 : 1);
        haloOrbitPhase.current = (haloOrbitPhase.current + delta * spinSpeed) % (Math.PI * 2);
      }
      haloRef.current.rotation.z = haloOrbitPhase.current;
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
      haloRef.current.scale.setScalar(haloScaleRef.current * (1 - suck.current.value * 0.95));
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
      coreGlowRef.current.scale.setScalar(coreScaleRef.current * (1 - suck.current.value * 0.95));
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = localTime.current;
      materialRef.current.uniforms.uMousePos.value.copy(mousePosRef.current);
      materialRef.current.uniforms.uMouseScreenPos.value.copy(mouseScreenPosRef.current);
      materialRef.current.uniforms.uAspect.value = screenAspect;
      materialRef.current.uniforms.uSuck.value = suck.current.value;
      // While the beam has hold of it, the planet flickers in its own colour.
      const uniforms = materialRef.current.uniforms;
      if (raidOnMe && pulling.current && suck.current.value > 0.02) {
        raidFlash.current += delta;
        const on = Math.floor(raidFlash.current * 7) % 2 === 0;
        uniforms.uIsHovered.value = 1;
        uniforms.uColor.value.copy(softenedThemeColor);
        uniforms.uGlowColor.value.copy(softenedThemeColor);
        uniforms.uHoverBrightness.value = (on ? 0.95 : 0.35) * Math.min(1, suck.current.value * 4);
      } else if (raidFlash.current > 0) {
        // Back to how it was (the hover effect keeps it lit if it is hovered).
        raidFlash.current = 0;
        if (!highlighted) {
          uniforms.uIsHovered.value = 0;
          gsap.to(uniforms.uHoverBrightness, { value: 0, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
          const rest = new THREE.Color(planetRest.color);
          gsap.to(uniforms.uColor.value, { r: rest.r, g: rest.g, b: rest.b, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
          gsap.to(uniforms.uGlowColor.value, { r: rest.r, g: rest.g, b: rest.b, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
        }
      }
      if ((raidOnMe || suck.current.value > 0) && pointsRef.current && groupRef.current) {
        groupRef.current.getWorldPosition(suckWorld.current);
        if (raidOnMe) {
          const rect = gl.domElement.getBoundingClientRect();
          trackPoint.current.copy(suckWorld.current).project(camera);
          raidTrack.x = rect.left + ((trackPoint.current.x + 1) / 2) * rect.width;
          raidTrack.y = rect.top + ((1 - trackPoint.current.y) / 2) * rect.height;
        }
        suckWorld.current.add(suckOffset.current);
        pointsRef.current.worldToLocal(materialRef.current.uniforms.uSuckPoint.value.copy(suckWorld.current));
      }
      if (viewState === 'HOME' || viewState === 'HOVER_PLANET') {
        const defaultParticleSize = visualMode === 'silent' ? 3.0 : visualMode === 'focus' ? 3.45 : 4.0;
        const portraitParticleSize = visualMode === 'silent' ? 1.02 : visualMode === 'focus' ? 1.2 : 1.42;
        materialRef.current.uniforms.uParticleSize.value = THREE.MathUtils.lerp(
          defaultParticleSize,
          portraitParticleSize,
          portraitProgress
        );
        const desktopFocusBoost = visualMode === 'focus'
          ? highlighted ? 2.05 : 1.48
          : visualMode === 'silent' ? 0.08 : highlighted ? 1.55 : 1.12;
        const mobileFocusBoost = visualMode === 'focus'
          ? highlighted ? 3.06 : 2.21
          : visualMode === 'silent' ? 0.12 : highlighted ? 2.52 : 2.15;
        materialRef.current.uniforms.uFocusBoost.value = THREE.MathUtils.lerp(
          desktopFocusBoost,
          mobileFocusBoost,
          portraitProgress
        );
        // Scale down particle opacity when hovered/focused to prevent additive blending blowout (white burnout)
        const baseOpacity = visualMode === 'silent' ? 0.56 : visualMode === 'focus' ? 0.74 : 1.0;
        const mobileOpacityScale = THREE.MathUtils.lerp(1, 0.78, portraitProgress);
        const targetOpacity = baseOpacity * (highlighted ? 0.48 : 0.82) * mobileOpacityScale;
        materialRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(
          materialRef.current.uniforms.uOpacity.value,
          targetOpacity,
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
    const orbitPos = orbitPositionRef.current.set(x, newY, newZ);
    const wheelAngle = -themeDef.orbitOffset + localTime.current * portraitWheelSpeed;
    const wheelX = Math.sin(wheelAngle) * portraitWheelRadiusX;
    const wheelY = portraitWheelCenterY + Math.cos(wheelAngle) * portraitWheelRadiusY;
    const wheelZ = 0.2 - Math.cos(wheelAngle) * 0.18;
    const portraitPos = portraitPositionRef.current.set(wheelX, wheelY, wheelZ);
    const homePos = blendedPositionRef.current.lerpVectors(orbitPos, portraitPos, portraitProgress);

    if (groupRef.current) {
      if (viewState === 'HOME' || viewState === 'HOVER_PLANET') {
        groupRef.current.position.copy(homePos);
        if (portraitProgress > 0.01 && viewState === 'HOME' && !highlighted) {
          const wheelDepthScale = 0.9 + ((portraitWheelCenterY - wheelY) / (portraitWheelRadiusY * 2) + 0.5) * 0.18;
          const targetScale = THREE.MathUtils.lerp(1, wheelDepthScale, portraitProgress);
          groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.045));
        } else if (portraitProgress <= 0.01 && viewState === 'HOME' && !highlighted) {
          groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, 1, 0.08));
        }
      } else if (isReturning.current) {
        // Smoothly blend from the expanded position back to the active responsive layout.
        groupRef.current.position.lerpVectors(returnStartPosition.current, homePos, returnProgress.current.value);
      } else if (viewState === 'LEAVING_THEME' && !isActive) {
        groupRef.current.position.copy(homePos);
      }

      if (themeDef.key) {
        const { x: px, y: py, z: pz } = groupRef.current.position;
        setPlanetPosition(themeDef.key, px, py, pz);
      }
    }
  });

  return (
    <group ref={groupRef} name={`planet-${themeDef.key}`}>
      {/* Invisible sphere for raycasting hit area. It expands on mobile portrait for thumb-friendly taps. */}
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
        <sphereGeometry args={[isMobilePortrait ? 1.8 : 1.35, 16, 16]} />
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
          blending={isHovered || isFocused ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </points>

      <mesh ref={coreGlowRef} visible={viewState !== 'THEME'}>
        <sphereGeometry args={[shapeProfile.glowRadius, 32, 32]} />
        <meshBasicMaterial
          color={idleGlowHex}
          transparent
          opacity={(isLastVisited ? shapeProfile.glowHover * 0.72 : isVisited ? shapeProfile.glowIdle * 1.35 : shapeProfile.glowIdle) * (visualMode === 'silent' ? 0.36 : visualMode === 'focus' ? 0.64 : 1)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={haloRef} geometry={haloGeometry} rotation={[haloDefaultTilt, 0, 0]} visible={viewState !== 'THEME'}>
        <meshBasicMaterial
          color={idleGlowHex}
          transparent
          opacity={(isHovered || isFocused ? 0.46 : isLastVisited ? 0.34 : isVisited ? 0.2 : 0.12) * (visualMode === 'silent' ? 0.35 : visualMode === 'focus' ? 0.62 : 1)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <Html
        position={[0, isMobilePortrait ? -1.32 : 2.0, 0]}
        center
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`
            flex flex-col items-center justify-center
            ${isMobilePortrait ? 'min-w-[5.4rem] px-3 py-2 rounded-xl' : 'px-5 py-2.5 rounded-2xl'} backdrop-blur-xl border border-white/10
            bg-[#0a0a0f]/60 text-gray-200 transition-all duration-300 ease-out
            ${((isHovered || isFocused) || isMobilePortrait) && (viewState === 'HOME' || viewState === 'HOVER_PLANET') && !introPlaying
              ? `translate-y-0 ${isMobilePortrait && !isHovered && !isFocused ? 'opacity-75 scale-90' : 'opacity-100 scale-100'}`
              : 'opacity-0 translate-y-4 scale-90'}
          `}
          style={{
            boxShadow: `0 4px 30px ${softenedThemeHex}24`,
          }}
        >
          <span 
            className={`${isMobilePortrait ? 'text-[10px] tracking-[0.16em] gap-1.5 whitespace-nowrap' : 'text-xs tracking-[0.2em] gap-2'} font-bold uppercase mb-0.5 flex items-center`}
            style={{ color: softenedThemeHex, textShadow: `0 0 10px ${softenedThemeHex}` }}
          >
            <span>{themeDef.title}</span>
            <span className="opacity-50 text-[10px] font-normal tracking-widest">|</span>
            <span className="tracking-widest">{themeDef.chineseName}</span>
          </span>
          <span className={`${isMobilePortrait ? 'hidden' : 'block'} text-[10px] text-gray-400 tracking-wider whitespace-nowrap`}>
            {themeDef.subtitle}
          </span>
        </div>
      </Html>
    </group>
  );
};
