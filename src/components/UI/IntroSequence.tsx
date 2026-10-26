import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { PetSprite } from './GuidePet';
import { introSpeed, introTiming, lightAt } from '../../utils/intro';

/*
 * The DOM half of the opening animation (see utils/intro.ts for the story
 * and the timings; GalaxyScene gathers the particles from the same timings).
 * It reuses the black-hole transition's hole, pixel hole and 星仔 styles.
 * The whole layer takes pointer events, so any tap skips it.
 */

const avatarRect = () => {
  const avatar = document.querySelector<HTMLElement>('.guide-pet-shell .guide-pet-avatar');
  const rect = avatar?.getBoundingClientRect();
  return rect && rect.width > 0 ? rect : null;
};

export const IntroSequence: React.FC = () => {
  const introPlaying = useGalaxyStore((state) => state.introPlaying);
  const points = useGalaxyStore((state) => state.introPoints);
  const finishIntro = useGalaxyStore((state) => state.finishIntro);
  const veilRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const petRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<HTMLDivElement>(null);

  // Hide the page's own UI and 星仔 until the galaxy is lit; skip on any key.
  useLayoutEffect(() => {
    if (!introPlaying) return;
    const html = document.documentElement;
    html.classList.add('intro-playing', 'pet-portaling');
    const skip = () => finishIntro();
    window.addEventListener('keydown', skip);
    // If the scene never reports where things are, don't keep the page dark.
    const fallback = window.setTimeout(() => {
      if (!useGalaxyStore.getState().introPoints) finishIntro();
    }, 5000);
    return () => {
      html.classList.remove('intro-playing', 'pet-portaling');
      window.removeEventListener('keydown', skip);
      window.clearTimeout(fallback);
    };
  }, [introPlaying, finishIntro]);

  useLayoutEffect(() => {
    const veil = veilRef.current;
    const hole = holeRef.current;
    const core = coreRef.current;
    const pet = petRef.current;
    const sparkLayer = sparksRef.current;
    if (!points || !veil || !hole || !core || !pet || !sparkLayer) return;

    const html = document.documentElement;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const star = points.core;
    const holeSize = Math.max(star.r * 2.2, 110);
    const home = avatarRect();
    const w = home?.width ?? 56;
    const h = home?.height ?? 56;
    // 星仔 lands just below the hole.
    const px = Math.min(Math.max(star.x, w / 2 + 8), W - w / 2 - 8);
    const py = Math.min(Math.max(star.y + holeSize * 0.5 + h * 0.45, h / 2 + 8), H - h / 2 - 8);

    gsap.set([hole, pet], { autoAlpha: 0, clearProps: 'transform' });
    gsap.set(hole, { width: holeSize, height: holeSize, left: star.x - holeSize / 2, top: star.y - holeSize / 2, scale: 0 });
    gsap.set(core, { opacity: 1 });
    gsap.set(pet, { width: w, height: h, left: star.x - w / 2, top: star.y - h / 2, scale: 0, rotation: -300 });

    const tl = gsap.timeline({ onComplete: () => finishIntro() }).timeScale(introSpeed);

    // 1. A black hole is born on the centre star as the dark lifts.
    tl.to(hole, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.4)' }, 0.1)
      .to(veil, { autoAlpha: 0, duration: 0.9, ease: 'power1.inOut' }, 0.25);

    // 2. It spits 星仔 out; 星仔 lands below it and shakes itself off.
    tl.set(pet, { autoAlpha: 1 }, introTiming.spit)
      .to(pet, { left: px - w / 2, top: py - h / 2, scale: 1, rotation: 0, duration: 0.38, ease: 'power2.out' }, introTiming.spit)
      .to(pet, { scaleY: 0.82, scaleX: 1.12, duration: 0.08, ease: 'power1.out', yoyo: true, repeat: 1 }, introTiming.spit + 0.38)
      .to(pet, { rotation: -8, duration: 0.07, ease: 'sine.inOut', yoyo: true, repeat: 3 }, introTiming.spit + 0.6);

    // 3. 星仔 throws a spark at each planet; a ring flashes where it lands
    //    and the planet's particles gather (GalaxyScene).
    const sparks = Array.from(sparkLayer.children) as HTMLElement[];
    const flashes: HTMLElement[] = [];
    points.planets.forEach((planet, i) => {
      const spark = sparks[i * 2];
      const flash = sparks[i * 2 + 1];
      if (!spark || !flash) return;
      flashes.push(flash);
      const from = { x: px, y: py - h * 0.3 };
      // A curve that rises above both ends.
      const lift = Math.min(from.y, planet.y) - Math.max(60, Math.abs(planet.x - from.x) * 0.25);
      const path = { t: 0 };
      const size = Math.min(Math.max(planet.r * 2.6, 48), 110);
      spark.style.setProperty('--spark-color', planet.color);
      flash.style.setProperty('--spark-color', planet.color);
      gsap.set(spark, { autoAlpha: 0, x: from.x, y: from.y });
      gsap.set(flash, { autoAlpha: 0, width: size, height: size, left: planet.x - size / 2, top: planet.y - size / 2, scale: 0.2 });
      const leave = introTiming.light + i * introTiming.gap;
      tl.to(pet, { y: -h * 0.18, duration: 0.09, ease: 'power2.out', yoyo: true, repeat: 1 }, leave - 0.06)
        .set(spark, { autoAlpha: 1 }, leave)
        .to(path, {
          t: 1,
          duration: introTiming.flight,
          ease: 'power1.in',
          onUpdate: () => {
            const t = path.t;
            const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * ((from.x + planet.x) / 2) + t * t * planet.x;
            const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * lift + t * t * planet.y;
            gsap.set(spark, { x, y });
          },
        }, leave)
        .set(spark, { autoAlpha: 0 }, lightAt(i))
        .set(flash, { autoAlpha: 1 }, lightAt(i))
        .to(flash, { scale: 1.6, duration: 0.6, ease: 'expo.out' }, lightAt(i))
        .to(flash, { autoAlpha: 0, duration: 0.45, ease: 'power1.in' }, lightAt(i) + 0.15);
    });

    // 4. The hole collapses into the centre star, which gathers around it.
    tl.to(hole, { scale: 0, rotation: 200, duration: 0.3, ease: 'power2.in' }, introTiming.collapse)
      .set(hole, { autoAlpha: 0 }, introTiming.collapse + 0.3)
      .call(() => html.classList.remove('intro-playing'), undefined, introTiming.ui);

    // 5. 星仔 walks from the centre to its usual spot (transforms only, so
    //    it stays smooth while the rings and the ship are still forming).
    const { walk, walkDuration } = introTiming;
    if (home) {
      const dx = home.left + w / 2 - px;
      const dy = home.top + h / 2 - py;
      tl.call(() => pet.classList.add('is-walking'), undefined, walk)
        .set(pet, { scaleX: dx < 0 ? -1 : 1 }, walk)
        .to(pet, { x: dx, y: dy, duration: walkDuration, ease: 'sine.inOut' }, walk)
        .call(() => {
          pet.classList.remove('is-walking');
          html.classList.remove('pet-portaling');
        }, undefined, walk + walkDuration)
        .set(pet, { autoAlpha: 0 }, walk + walkDuration + 0.05);
    } else {
      tl.to(pet, { autoAlpha: 0, duration: 0.4 }, walk);
    }
    tl.to({}, { duration: 0 }, introTiming.total);

    return () => {
      tl.kill();
    };
  }, [points, finishIntro]);

  if (!introPlaying) return null;

  return (
    <div className="portal-layer intro-layer is-running" onPointerDown={() => finishIntro()} aria-hidden="true">
      <div ref={veilRef} className="intro-veil" />
      <div ref={holeRef} className="portal-hole">
        <div className="portal-hole-disk" />
        <div ref={coreRef} className="portal-hole-core" />
      </div>
      <div ref={sparksRef} className="intro-sparks">
        {Array.from({ length: 5 }, (_, i) => (
          <React.Fragment key={i}>
            <span className="intro-spark" />
            <span className="intro-flash" />
          </React.Fragment>
        ))}
      </div>
      <div ref={petRef} className="portal-pet">
        <div className="guide-pet-avatar">
          <PetSprite />
        </div>
      </div>
      <p className="intro-skip">轻点任意处跳过</p>
    </div>
  );
};
