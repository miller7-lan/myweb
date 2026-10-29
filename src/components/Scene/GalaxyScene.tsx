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
import { FinaleFlight } from './FinaleFlight';
import { themes } from '../../data/themes';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { petRect, wormholePull } from '../../utils/portal';
import { introSpeed, introTiming, lightAt } from '../../utils/intro';
import { canRaid } from '../../utils/raid';
import { canStartFinale, isShortFinale } from '../../utils/finale';

export const GalaxyScene: React.FC = () => {
  const mousePos = useRef(new THREE.Vector3(0, 0, 0));
  const mouseScreenPos = useRef(new THREE.Vector2(0, 0));
  const { camera, size, gl } = useThree();
  const setIntroPoints = useGalaxyStore((state) => state.setIntroPoints);
  const { viewState } = useGalaxyStore();
  const isMobilePortrait = size.width <= 768 && size.height > size.width;
  const galaxyGroup = useRef<THREE.Group>(null);
  const layoutProgress = useRef({ value: isMobilePortrait ? 1 : 0 });
  const planetsGroup = useRef<THREE.Group>(null);
  const pointerVector = useRef(new THREE.Vector3());
  const pointerTarget = useRef(new THREE.Vector3());

  const introPlaying = useGalaxyStore((state) => state.introPlaying);
  const introTimeline = useRef<gsap.core.Timeline | null>(null);
  const introFrames = useRef(0);

  // Gathers (or scatters) every particle field inside `group`.
  const setIntroProgress = (group: THREE.Object3D, value: number, skip?: THREE.Object3D | null) => {
    group.traverse((child) => {
      if (child !== skip && child instanceof THREE.Points && child.material instanceof THREE.ShaderMaterial && child.material.uniforms.uIntroProgress) {
        child.material.uniforms.uIntroProgress.value = value;
      }
    });
  };
  const planetGroups = () =>
    Object.values(themes).map((theme) => planetsGroup.current?.getObjectByName(`planet-${theme.key}`) ?? null);

  // A point in the scene on screen, in CSS px, with the screen size of `radius` there.
  const toScreen = (world: THREE.Vector3, radius: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    const centre = world.clone().project(camera);
    const edge = world.clone().add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(radius)).project(camera);
    const x = rect.left + ((centre.x + 1) / 2) * rect.width;
    const y = rect.top + ((1 - centre.y) / 2) * rect.height;
    return { x, y, r: Math.abs(rect.left + ((edge.x + 1) / 2) * rect.width - x) };
  };

  // The UFO (utils/raid.ts): pick a planet, and where the UFO comes from,
  // hovers and flees to.
  const raidRequest = useGalaxyStore((state) => state.raidRequest);
  const raidId = useRef(0);
  useEffect(() => {
    if (raidRequest === 0 || !canRaid()) return;
    const groups = planetGroups();
    const choices = Object.values(themes)
      .map((theme, i) => ({ theme, group: groups[i] }))
      .filter((choice) => choice.group && choice.theme.key);
    const pick = choices[Math.floor(Math.random() * choices.length)];
    if (!pick?.group || !pick.theme.key) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const world = pick.group.getWorldPosition(new THREE.Vector3());
    const planet = toScreen(world, 0.55);
    const lift = Math.max(110, planet.r * 3.2);
    const hover = {
      x: Math.min(Math.max(planet.x, 60), W - 60),
      y: Math.max(56, planet.y - lift),
    };
    // That spot in the scene, at the planet's depth.
    const rect = gl.domElement.getBoundingClientRect();
    const depth = world.clone().project(camera).z;
    const hoverWorld = new THREE.Vector3(
      ((hover.x - rect.left) / rect.width) * 2 - 1,
      1 - ((hover.y - rect.top) / rect.height) * 2,
      depth,
    ).unproject(camera);
    const fromLeft = Math.random() < 0.5;
    const from = { x: fromLeft ? -90 : W + 90, y: 40 + Math.random() * H * 0.45 };
    // It flees the other way, climbing.
    const exit = { x: fromLeft ? W + 120 : -120, y: -80 - Math.random() * 60 };
    raidId.current += 1;
    useGalaxyStore.getState().setRaid({
      id: raidId.current,
      planet: pick.theme.key,
      color: pick.theme.color,
      ...planet,
      hover,
      hoverWorld: [hoverWorld.x, hoverWorld.y, hoverWorld.z],
      from,
      exit,
    });
    // planetGroups and toScreen read refs and the camera at the time of the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raidRequest]);

  // The finale (utils/finale.ts): find the centre star and 星仔 on screen.
  const finaleRequest = useGalaxyStore((state) => state.finaleRequest);
  const finaleId = useRef(0);
  useEffect(() => {
    const core = galaxyGroup.current;
    if (finaleRequest === 0 || !core || !canStartFinale()) return;
    const store = useGalaxyStore.getState();
    store.setHoveredPlanet(null);
    store.setViewState('HOME');
    finaleId.current += 1;
    store.setFinale({
      id: finaleId.current,
      core: toScreen(core.getWorldPosition(new THREE.Vector3()), 2.0 * core.scale.x),
      pet: petRect(),
      short: isShortFinale(),
    });
    // toScreen reads the camera at the time of the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finaleRequest]);

  // No opening animation (or it has just been skipped or finished): everything is in place.
  useEffect(() => {
    if (introPlaying) return;
    introTimeline.current?.kill();
    introTimeline.current = null;
    const ring = galaxyGroup.current?.getObjectByName('ring-particles');
    if (ring) ring.visible = true;
    for (const group of [galaxyGroup.current, ...planetGroups()]) {
      if (!group) continue;
      group.visible = true;
      setIntroProgress(group, 1);
    }
  }, [introPlaying]);

  useEffect(() => () => {
    introTimeline.current?.kill();
  }, []);

  // The opening animation: everything starts hidden and scattered. Once the
  // planets have taken their places (a couple of frames), find them on screen,
  // hand that to IntroSequence and gather each one as its spark lands.
  const startIntro = () => {
    const core = galaxyGroup.current;
    const groups = planetGroups();
    if (!core || groups.some((group) => !group)) return false;
    // The core is still easing into its layout; aim at where it ends up.
    const homeScale = isMobilePortrait ? 0.36 : 1;
    const corePoint = toScreen(new THREE.Vector3(0, isMobilePortrait ? -0.82 : 0, 0), 2.0 * homeScale);
    const planets = Object.values(themes)
      .map((theme, i) => ({ key: theme.key, color: theme.color, group: groups[i]!, ...toScreen(groups[i]!.getWorldPosition(new THREE.Vector3()), 0.55) }))
      .sort((a, b) => a.x - b.x);

    const tl = gsap.timeline().timeScale(introSpeed);
    planets.forEach((planet, i) => {
      const progress = { value: 0 };
      tl.call(() => {
        planet.group.visible = true;
        planet.group.scale.setScalar(0.35);
      }, undefined, lightAt(i))
        .to(progress, { value: 1, duration: introTiming.gather, ease: 'expo.out', onUpdate: () => setIntroProgress(planet.group, progress.value) }, lightAt(i));
    });
    // The centre star gathers out of the scattered particles, then the rings
    // spread out of it.
    const ring = core.getObjectByName('ring-particles') ?? null;
    const coreProgress = { value: 0 };
    const ringProgress = { value: 0 };
    // Hidden until it starts spreading, or it reads as a bright disc on the star.
    if (ring) ring.visible = false;
    tl.call(() => { core.visible = true; }, undefined, introTiming.core)
      .to(coreProgress, { value: 1, duration: introTiming.coreGather, ease: 'expo.out', onUpdate: () => setIntroProgress(core, coreProgress.value, ring) }, introTiming.core);
    if (ring) {
      tl.call(() => { ring.visible = true; }, undefined, introTiming.ring)
        .to(ringProgress, { value: 1, duration: introTiming.ringGrow, ease: 'power3.out', onUpdate: () => setIntroProgress(ring, ringProgress.value) }, introTiming.ring);
    }
    introTimeline.current = tl;

    setIntroPoints({ core: corePoint, planets: planets.map(({ key, color, x, y, r }) => ({ key, color, x, y, r })) });
    return true;
  };

  const portal = useGalaxyStore((state) => state.portal);

  useEffect(() => {
    if (!galaxyGroup.current) return;

    const isTheme = viewState === 'ENTERING_THEME' || viewState === 'THEME';
    const homeScale = isMobilePortrait ? 0.36 : 1;
    // Read the plan straight from the store: ThemePlanet sets it in this same commit.
    const plan = useGalaxyStore.getState().portal;
    const wormhole = plan?.kind === 'enter' && plan.style === 'wormhole';

    if (wormhole && viewState === 'ENTERING_THEME') {
      // The wormhole: once 星仔 has walked in, the core and its rings swirl
      // down into the black hole that sits on top of them.
      const at = plan.timing.lead + plan.timing.summon + wormholePull.start;
      gsap.killTweensOf(galaxyGroup.current.scale);
      gsap.to(galaxyGroup.current.scale, { x: 0.01, y: 0.01, z: 0.01, delay: at, duration: wormholePull.duration, ease: 'power1.in' });
      gsap.to(galaxyGroup.current.rotation, { y: '+=3.6', delay: at, duration: wormholePull.duration, ease: 'sine.in' });
      return;
    }
    if (wormhole && viewState === 'THEME') {
      gsap.killTweensOf(galaxyGroup.current.scale);
      galaxyGroup.current.scale.setScalar(0.01);
      return;
    }
    
    // Unwind the wormhole's swirl on the way back out.
    if (!isTheme && galaxyGroup.current.rotation.y !== 0) {
      gsap.to(galaxyGroup.current.rotation, { y: 0, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
    }

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
    
  }, [isMobilePortrait, viewState, portal]);

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

    // The first two frames draw everything once behind the intro's black
    // veil, so every shader (and the ship's lights) is compiled up front
    // instead of stalling a frame when each part first appears.
    if (introPlaying && !introTimeline.current) {
      introFrames.current += 1;
      if (introFrames.current >= 3) {
        if (galaxyGroup.current) galaxyGroup.current.visible = false;
        for (const group of planetGroups()) if (group) group.visible = false;
        startIntro();
      }
    }

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
      <group ref={galaxyGroup} name="galaxy-core">
        <SaturnCore
          mousePosRef={mousePos}
          mouseScreenPosRef={mouseScreenPos}
          screenAspect={size.width / size.height}
          isMobilePortrait={isMobilePortrait}
        />
        <ParticleRing
          mousePosRef={mousePos}
          mouseScreenPosRef={mouseScreenPos}
          screenAspect={size.width / size.height}
        />
        <ConstellationFireworks isMobilePortrait={isMobilePortrait} />
      </group>
      
      {/* Planets are outside galaxyGroup so they don't fade/shrink with it */}
      <group ref={planetsGroup} name="planets">
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

      <FinaleFlight />
    </>
  );
};
