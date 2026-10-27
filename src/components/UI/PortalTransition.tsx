import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { PetSprite } from './GuidePet';
import { createWarpField } from '../../utils/warpField';
import { wormholePull } from '../../utils/portal';

/*
 * The DOM half of the black-hole transition (see utils/portal.ts for the
 * story and the timings; ThemePlanet runs the 3D half from the same plan).
 * Everything here animates transform and opacity only, except the veil,
 * whose hole and its ring of colour are one radial gradient, so it stays
 * light on phones.
 */

// A 16 × 16 pixel black hole: a black core inside a ring of the theme colour,
// lighter on one side so the stepped rotation reads as a swirl.
const pixelHole = (() => {
  const cells: Array<{ x: number; y: number; tone: 'core' | 'ring' | 'glint' }> = [];
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const dx = x + 0.5 - 8;
      const dy = y + 0.5 - 8;
      const d = Math.hypot(dx, dy);
      if (d < 4.6) cells.push({ x, y, tone: 'core' });
      else if (d < 7.2) cells.push({ x, y, tone: Math.atan2(dy, dx) > 1.2 && Math.atan2(dy, dx) < 2.6 ? 'glint' : 'ring' });
    }
  }
  return cells;
})();

export const PixelHole: React.FC<{ holeRef: React.RefObject<HTMLDivElement | null> }> = ({ holeRef }) => (
  <div ref={holeRef} className="portal-pixel-hole">
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {pixelHole.map((cell) => (
        <rect key={`${cell.x}-${cell.y}`} className={`hole-${cell.tone}`} x={cell.x} y={cell.y} width="1" height="1" />
      ))}
    </svg>
  </div>
);

export const PortalTransition: React.FC = () => {
  const portal = useGalaxyStore((state) => state.portal);
  const setPortal = useGalaxyStore((state) => state.setPortal);
  const rootRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const holeARef = useRef<HTMLDivElement>(null);
  const holeBRef = useRef<HTMLDivElement>(null);
  const petRef = useRef<HTMLDivElement>(null);
  const warpRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const veil = veilRef.current;
    const hole = holeRef.current;
    const core = coreRef.current;
    const holeA = holeARef.current;
    const holeB = holeBRef.current;
    const pet = petRef.current;
    const warpCanvas = warpRef.current;
    if (!portal || !root || !veil || !hole || !core || !holeA || !holeB || !pet || !warpCanvas) return;

    const { x, y, r, timing } = portal;
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Far enough from the planet to clear every corner of the screen.
    const cover = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 24;
    // The big hole: its black core is half its diameter.
    const holeSize = Math.max(r * 2.4, 44) * 2;
    const coverScale = cover / (holeSize * 0.25);
    const html = document.documentElement;

    root.style.setProperty('--portal-color', portal.color);
    gsap.set([veil, hole, holeA, holeB, pet, warpCanvas], { autoAlpha: 0, clearProps: 'transform' });
    gsap.set(hole, { width: holeSize, height: holeSize, left: x - holeSize / 2, top: y - holeSize / 2, scale: 0 });
    gsap.set(core, { opacity: 0 });
    gsap.set(veil, { '--portal-x': `${x}px`, '--portal-y': `${y}px`, '--portal-r': '0px' });

    const warp = portal.style === 'wormhole' ? createWarpField(warpCanvas, portal.color) : null;
    let petExit: gsap.core.Timeline | null = null;
    // The wormhole's black hole sits on the centre star.
    const star = portal.core ?? { x: W / 2, y: H / 2, r: 40 };
    const starHole = Math.max(star.r * 2.2, 96);

    const done = () => {
      warp?.stop();
      pet.classList.remove('is-back', 'is-walking');
      gsap.set([veil, hole, holeA, holeB, pet, warpCanvas], { autoAlpha: 0 });
      html.classList.remove('pet-portaling');
      if (useGalaxyStore.getState().portal?.id === portal.id) setPortal(null);
    };
    // The wormhole's opening (the centre star reeling the planet in) is ThemePlanet's and CoreTether's.
    const tl = gsap.timeline({ onComplete: done, delay: portal.kind === 'enter' ? timing.lead : 0 });

    if (portal.kind === 'enter') {
      const { summon, swallow, reveal } = timing;

      // 1. 星仔 drops through a hole under itself and pops out beside the planet.
      if (portal.pet && summon > 0) {
        const { x: px, y: py, width: w, height: h } = portal.pet;
        const holeW = Math.max(48, w * 0.95);
        // 星仔 lands beside the planet, or (wormhole) just below the black
        // hole on the centre star, ready to walk into it.
        let qx: number;
        let qy: number;
        if (portal.style === 'wormhole') {
          qx = star.x;
          qy = star.y + starHole * 0.5 + h * 0.45;
        } else {
          qx = x + r * 0.8 + w * 0.6;
          if (qx + w / 2 > W - 8) qx = x - r * 0.8 - w * 0.6;
          qy = y - h * 0.1;
        }
        qx = Math.min(Math.max(qx, w / 2 + 8), W - w / 2 - 8);
        qy = Math.min(Math.max(qy, h / 2 + 8), H - h / 2 - 8);

        gsap.set(pet, { left: px, top: py, width: w, height: h, scale: 1, rotation: 0, y: 0 });
        tl.call(() => html.classList.add('pet-portaling'), undefined, 0).set(pet, { autoAlpha: 1 }, 0);
        gsap.set(holeA, { width: holeW, height: holeW, left: px + w / 2 - holeW / 2, top: py + h * 0.9 - holeW / 2, scaleY: 0.42, scaleX: 0 });
        gsap.set(holeB, { width: holeW, height: holeW, left: qx - holeW / 2, top: qy + h * 0.4 - holeW / 2, scaleY: 0, scaleX: 0 });

        // Choreographed at 1.05s, stretched to whatever the summon lasts.
        const summonTl = gsap.timeline();
        tl.add(summonTl.timeScale(1.05 / summon), 0);
        summonTl.to(pet, { scale: 1.12, duration: 0.1, ease: 'power2.out', yoyo: true, repeat: 1 }, 0)
          .to(holeA, { autoAlpha: 1, scaleX: 1, duration: 0.24, ease: 'back.out(2)' }, 0.14)
          .to(pet, { scale: 0, rotation: 300, y: h * 0.4, duration: 0.28, ease: 'power2.in' }, 0.34)
          .to(holeA, { scaleX: 0, scaleY: 0, duration: 0.16, ease: 'power2.in' }, 0.6)
          .to(holeB, { autoAlpha: 1, scaleX: 1, scaleY: 0.42, duration: 0.2, ease: 'back.out(2)' }, 0.55)
          .set(pet, { left: qx - w / 2, top: qy - h / 2, rotation: -300, y: h * 0.4 }, 0.7)
          .to(pet, { scale: 1, rotation: 0, y: -h * 0.3, duration: 0.22, ease: 'power2.out' }, 0.72)
          .to(pet, { y: 0, duration: 0.14, ease: 'power2.in' }, 0.94)
          .to(holeB, { scaleX: 0, scaleY: 0, duration: 0.15, ease: 'power2.in' }, 0.9);
      }

      const burst = summon + swallow;
      const withPet = Boolean(portal.pet && summon > 0);

      if (portal.style === 'wormhole' && warp) {
        // 1B (during the summon). The centre star turns into a black hole.
        const centre = { x: W / 2, y: H / 2 };
        gsap.set(hole, { width: starHole, height: starHole, left: star.x - starHole / 2, top: star.y - starHole / 2, scale: 0 });
        tl.to(hole, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'back.out(1.3)' }, 0.1)
          .to(core, { opacity: 1, duration: 0.7, ease: 'power1.in' }, 0.2);

        // 2B. 星仔 turns its back and walks in; then everything is pulled in
        //     after it (GalaxyScene, ThemePlanet, BackgroundStars) and the
        //     hole opens over the screen into a tunnel of streaking stars.
        if (withPet && portal.pet) {
          const { width: w, height: h } = portal.pet;
          tl.call(() => pet.classList.add('is-back', 'is-walking'), undefined, summon)
            .to(pet, { left: star.x - w / 2, top: star.y - h / 2, scale: 0.18, duration: 0.65, ease: 'power1.in' }, summon)
            .set(pet, { autoAlpha: 0 }, summon + 0.65);
        }
        const pullEnd = summon + wormholePull.start + wormholePull.duration;
        tl.to(hole, { scale: 1.35, duration: wormholePull.duration, ease: 'power2.in' }, summon + wormholePull.start)
          .to(hole, { scale: (cover / (starHole * 0.25)) * 1.05, duration: burst - pullEnd + 0.15, ease: 'power3.in' }, pullEnd - 0.15);
        warp.state.cx = star.x;
        warp.state.cy = star.y;
        gsap.set(warpCanvas, { autoAlpha: 1 });
        tl.call(() => warp.start(), undefined, pullEnd - 0.2)
          .to(warp.state, { alpha: 1, speed: 0.5, duration: 0.3, ease: 'power1.in' }, pullEnd - 0.2)
          .to(warp.state, { cx: centre.x, cy: centre.y, duration: burst - pullEnd + 0.3, ease: 'power2.inOut' }, pullEnd - 0.3)
          .to(warp.state, { speed: 3, duration: burst - pullEnd + 0.3, ease: 'power2.in' }, pullEnd - 0.3)
          .to(warp.state, { bg: 1, duration: 0.3, ease: 'power1.in' }, burst - 0.35);

        // 3B. Out of the tunnel: the streaks slow and thin out over the page.
        tl.set([pet, hole], { autoAlpha: 0 }, burst)
          .call(() => pet.classList.remove('is-back', 'is-walking'), undefined, burst)
          .to(warp.state, { bg: 0, duration: reveal * 0.45, ease: 'power2.out' }, burst)
          .to(warp.state, { speed: 0.15, duration: reveal, ease: 'power3.out' }, burst)
          .to(warp.state, { alpha: 0, duration: reveal * 0.8, ease: 'power1.in' }, burst + reveal * 0.2)
          .call(() => {
            const content = document.querySelectorAll('.theme-content');
            if (content.length) gsap.fromTo(content, { scale: 0.88, transformOrigin: '50% 40%' }, { scale: 1, duration: reveal * 1.2, ease: 'power3.out', clearProps: 'scale' });
          }, undefined, burst + 0.05);
      } else {
        // 2A. A hole opens on the planet, swallows it (and 星仔), then the screen.
        tl.to(hole, { autoAlpha: 1, scale: 1, duration: swallow * 0.25, ease: 'back.out(1.6)' }, summon)
          .to(core, { opacity: 1, duration: swallow * 0.5, ease: 'power1.in' }, summon + swallow * 0.1)
          .to(hole, { scale: coverScale, duration: swallow * 0.4, ease: 'power3.in' }, summon + swallow * 0.6);
        if (withPet && portal.pet) {
          const { width: w, height: h } = portal.pet;
          tl.to(pet, { left: x - w / 2, top: y - h / 2, scale: 0, rotation: 540, duration: swallow * 0.4, ease: 'power2.in' }, summon + swallow * 0.22);
        }

        // 3A. The page appears as the hole bursts open, its edge a ring of colour.
        tl.set(veil, { autoAlpha: 1 }, burst)
          .set([hole, pet], { autoAlpha: 0 }, burst)
          .to(veil, { '--portal-r': `${cover}px`, duration: reveal, ease: 'expo.out' }, burst + 0.04);
      }

      // 4. Once the page is open, 星仔 climbs out of a small hole at its usual spot.
      if (withPet) {
        const exitAt = burst + reveal * 0.55;
        tl.call(() => {
          const avatar = document.querySelector<HTMLElement>('.guide-pet-shell .guide-pet-avatar');
          const rect = avatar?.getBoundingClientRect();
          if (!rect || rect.width === 0) {
            html.classList.remove('pet-portaling');
            return;
          }
          const { left: px, top: py, width: w, height: h } = rect;
          const holeW = Math.max(48, w * 0.95);
          gsap.set(holeA, { width: holeW, height: holeW, left: px + w / 2 - holeW / 2, top: py + h * 0.9 - holeW / 2, scaleX: 0, scaleY: 0.42, autoAlpha: 1 });
          gsap.set(pet, { left: px, top: py, width: w, height: h, scale: 0, rotation: -300, y: h * 0.4, autoAlpha: 1 });
          petExit = gsap.timeline({ onComplete: () => html.classList.remove('pet-portaling') })
            .to(holeA, { scaleX: 1, duration: 0.22, ease: 'back.out(2)' }, 0)
            .to(pet, { scale: 1, rotation: 0, y: -h * 0.3, duration: 0.3, ease: 'power2.out' }, 0.18)
            .to(pet, { y: 0, duration: 0.18, ease: 'power2.in' }, 0.48)
            .to(holeA, { scaleX: 0, scaleY: 0, duration: 0.18, ease: 'power2.in' }, 0.5)
            .set(pet, { autoAlpha: 0 }, 0.68);
        }, undefined, exitAt);
        tl.to({}, { duration: 0 }, exitAt + 0.75);
      } else {
        tl.call(() => html.classList.remove('pet-portaling'), undefined, burst);
      }
    } else {
      const { close, spit } = timing;

      // 1. The page closes into the planet's spot behind a ring of colour.
      gsap.set(veil, { '--portal-r': `${cover}px`, autoAlpha: 1 });
      tl.to(veil, { '--portal-r': '0px', duration: close, ease: 'power3.in' }, 0)
        .call(() => {
          const shell = document.querySelector('.theme-shell');
          if (shell) gsap.set(shell, { autoAlpha: 0 });
        }, undefined, close);

      // 2. The galaxy comes back around a hole that spits the planet out.
      gsap.set(core, { opacity: 1 });
      tl.set(hole, { autoAlpha: 1, scale: 1 }, close)
        .to(veil, { autoAlpha: 0, duration: spit * 0.45, ease: 'power1.out' }, close)
        .to(core, { opacity: 0, duration: spit * 0.45, ease: 'power1.in' }, close + spit * 0.15)
        .to(hole, { scale: 0, duration: spit * 0.45, ease: 'power2.in' }, close + spit * 0.5);

      // 星仔 travels back: into a small hole as the page closes, and out of
      // another at its own spot once the galaxy is back.
      if (portal.pet) {
        const { x: px, y: py, width: w, height: h } = portal.pet;
        const holeW = Math.max(48, w * 0.95);
        html.classList.add('pet-portaling');
        gsap.set(pet, { left: px, top: py, width: w, height: h, autoAlpha: 1, scale: 1, rotation: 0, y: 0 });
        gsap.set(holeA, { width: holeW, height: holeW, left: px + w / 2 - holeW / 2, top: py + h * 0.9 - holeW / 2, scaleY: 0.42, scaleX: 0 });
        const back = close + spit;
        tl.to(holeA, { autoAlpha: 1, scaleX: 1, duration: 0.22, ease: 'back.out(2)' }, 0)
          .to(pet, { scale: 0, rotation: 300, y: h * 0.4, duration: 0.3, ease: 'power2.in' }, 0.16)
          .to(holeA, { scaleX: 0, scaleY: 0, duration: 0.16, ease: 'power2.in' }, 0.44)
          .to(holeA, { scaleX: 1, scaleY: 0.42, duration: 0.22, ease: 'back.out(2)' }, back)
          .to(pet, { scale: 1, rotation: 0, y: -h * 0.3, duration: 0.3, ease: 'power2.out' }, back + 0.18)
          .to(pet, { y: 0, duration: 0.18, ease: 'power2.in' }, back + 0.48)
          .to(holeA, { scaleX: 0, scaleY: 0, duration: 0.18, ease: 'power2.in' }, back + 0.5)
          .call(() => html.classList.remove('pet-portaling'), undefined, back + 0.68);
      }
    }

    return () => {
      tl.kill();
      petExit?.kill();
      warp?.stop();
      html.classList.remove('pet-portaling');
    };
  }, [portal, setPortal]);

  return (
    <div ref={rootRef} className={`portal-layer ${portal ? 'is-running' : ''}`} aria-hidden="true">
      <div ref={veilRef} className="portal-veil" />
      <div ref={holeRef} className="portal-hole">
        <div className="portal-hole-disk" />
        <div ref={coreRef} className="portal-hole-core" />
      </div>
      <canvas ref={warpRef} className="portal-warp" />
      <PixelHole holeRef={holeARef} />
      <PixelHole holeRef={holeBRef} />
      <div ref={petRef} className="portal-pet">
        <div className="guide-pet-avatar">
          <PetSprite />
        </div>
      </div>
    </div>
  );
};
