import React, { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { canRaid, nextRaidDelay, petReact, raidTiming, raidTrack } from '../../utils/raid';

/*
 * The DOM half of the UFO easter egg (see utils/raid.ts): the UFO, its
 * beam, 星仔's stars and the smoke. It also brings the UFO
 * round about once a minute while the galaxy is on screen.
 */

// A flying saucer drawn on a 40 by 22 pixel grid, in 星仔's palette:
// [x, y, width, height, classes]. The class names are written out in full
// so the stylesheet keeps their rules.
const ufoPixels: Array<[number, number, number, number, string]> = [
  // Glass dome.
  [16, 1, 8, 1, 'ufo-glass'], [14, 2, 12, 1, 'ufo-glass'], [13, 3, 14, 1, 'ufo-glass'], [12, 4, 16, 6, 'ufo-glass'],
  [15, 2, 2, 1, 'ufo-shine'], [14, 3, 1, 2, 'ufo-shine'], [13, 5, 1, 2, 'ufo-shine'], [25, 7, 1, 2, 'ufo-glass-edge'],
  // The pilot: a little green alien with two antennae.
  [17, 3, 1, 2, 'ufo-alien-dark'], [22, 3, 1, 2, 'ufo-alien-dark'], [16, 2, 1, 1, 'ufo-alien-tip'], [23, 2, 1, 1, 'ufo-alien-tip'],
  [17, 5, 6, 5, 'ufo-alien'], [16, 6, 8, 4, 'ufo-alien'], [16, 9, 8, 1, 'ufo-alien-dark'],
  [18, 6, 1, 2, 'ufo-eye'], [21, 6, 1, 2, 'ufo-eye'], [18, 6, 1, 1, 'ufo-eye-shine'], [21, 6, 1, 1, 'ufo-eye-shine'], [19, 8, 2, 1, 'ufo-alien-dark'],
  // Dome collar.
  [11, 10, 18, 1, 'ufo-metal-dark'], [12, 10, 16, 1, 'ufo-metal-mid'],
  // Saucer.
  [8, 11, 24, 1, 'ufo-metal-light'], [5, 12, 30, 1, 'ufo-metal'], [3, 13, 34, 1, 'ufo-metal'], [2, 14, 36, 2, 'ufo-metal'],
  [9, 11, 6, 1, 'ufo-shine'], [5, 12, 4, 1, 'ufo-shine'], [3, 13, 2, 1, 'ufo-shine'],
  [2, 16, 36, 1, 'ufo-metal-mid'], [4, 17, 32, 1, 'ufo-metal-dark'], [8, 18, 24, 1, 'ufo-metal-deep'],
  // Running lights along the rim.
  [5, 14, 2, 1, 'ufo-light ufo-light-a'], [10, 14, 2, 1, 'ufo-light ufo-light-b'], [15, 14, 2, 1, 'ufo-light ufo-light-c'],
  [23, 14, 2, 1, 'ufo-light ufo-light-a'], [28, 14, 2, 1, 'ufo-light ufo-light-b'], [33, 14, 2, 1, 'ufo-light ufo-light-c'],
  // Beam emitter underneath.
  [14, 19, 12, 1, 'ufo-metal-deep'], [16, 20, 8, 1, 'ufo-emitter'], [18, 21, 4, 1, 'ufo-emitter-core'],
];

export const UfoSprite: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`ufo-sprite ${className ?? ''}`} viewBox="0 0 40 22" shapeRendering="crispEdges" aria-hidden="true">
    {ufoPixels.map(([x, y, width, height, part], i) => (
      <rect key={i} className={part} x={x} y={y} width={width} height={height} />
    ))}
  </svg>
);

const avatarRect = () => {
  const avatar = document.querySelector<HTMLElement>('.guide-pet-shell .guide-pet-avatar');
  const rect = avatar?.getBoundingClientRect();
  return rect && rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight ? rect : null;
};

const puffCount = 36;

export const UfoRaid: React.FC = () => {
  const raid = useGalaxyStore((state) => state.raid);
  const viewState = useGalaxyStore((state) => state.viewState);
  const introPlaying = useGalaxyStore((state) => state.introPlaying);
  const followRef = useRef<HTMLDivElement>(null);
  const ufoRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const smokeRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  // Comes round about once a minute; tries again shortly if the moment is wrong.
  useEffect(() => {
    if (introPlaying || raid) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        if (canRaid() && !document.hidden) useGalaxyStore.getState().requestRaid();
        else schedule(8000);
      }, delay);
    };
    schedule(nextRaidDelay());
    return () => window.clearTimeout(timer);
  }, [introPlaying, raid]);

  // Called off if the visitor opens a page (or anything else takes over).
  useEffect(() => {
    if (raid && viewState !== 'HOME' && viewState !== 'HOVER_PLANET') useGalaxyStore.getState().setRaid(null);
  }, [raid, viewState]);

  useLayoutEffect(() => {
    const follow = followRef.current;
    const ufo = ufoRef.current;
    const beam = beamRef.current;
    const starLayer = starsRef.current;
    const smokeLayer = smokeRef.current;
    const flash = flashRef.current;
    if (!raid || !follow || !ufo || !beam || !starLayer || !smokeLayer || !flash) return;

    const t = raidTiming;
    const { hover, from, exit } = raid;
    const small = window.innerWidth <= 768;
    const w = small ? 60 : 84;
    const h = (w * 22) / 40;
    const beamTop = hover.y + h * 0.45;
    const beamHeight = Math.max(30, raid.y - beamTop + raid.r * 0.4);
    const beamWidth = Math.max(54, raid.r * 2.8);
    const stars = Array.from(starLayer.children) as HTMLElement[];
    const puffs = Array.from(smokeLayer.children) as HTMLElement[];

    // The UFO, its beam and the hit flash ride on `follow`, which keeps them
    // over the planet as it goes round its orbit (or stays put when the
    // planets stop). It lets go when the UFO flees.
    raidTrack.x = raid.x;
    raidTrack.y = raid.y;
    const offset = { x: 0, y: 0, following: true };
    const track = () => {
      if (!offset.following) return;
      offset.x = raidTrack.x - raid.x;
      offset.y = raidTrack.y - raid.y;
      gsap.set(follow, { x: offset.x, y: offset.y });
    };
    gsap.set(follow, { x: 0, y: 0 });
    gsap.ticker.add(track);

    ufo.style.setProperty('--raid-color', raid.color);
    beam.style.setProperty('--raid-color', raid.color);
    gsap.set(ufo, { width: w, height: h, x: from.x - w / 2, y: from.y - h / 2, rotation: from.x < hover.x ? 12 : -12, autoAlpha: 1, filter: 'none' });
    ufo.classList.remove('is-damaged');
    gsap.set(beam, { left: hover.x - beamWidth / 2, top: beamTop, width: beamWidth, height: beamHeight, scaleY: 0, autoAlpha: 0 });
    gsap.set([...stars, ...puffs, flash], { autoAlpha: 0 });

    const tl = gsap.timeline({ onComplete: () => useGalaxyStore.getState().setRaid(null) });
    // A gentle bob while it hovers.
    const bob = gsap.to(ufo, { '--bob': 1, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    // 1. It swoops in and stops over the planet.
    tl.to(ufo, { x: hover.x - w / 2, y: hover.y - h / 2, duration: t.arrive, ease: 'power3.out' }, 0)
      .to(ufo, { rotation: 0, duration: 0.5, ease: 'back.out(3)' }, t.arrive - 0.4);

    // 2. The beam opens and pulls the planet's particles up (ThemePlanet).
    tl.to(beam, { autoAlpha: 1, scaleY: 1, duration: 0.3, ease: 'power2.out' }, t.beam);

    // 3. 星仔 is shocked, then throws three stars, each on a parabola.
    tl.call(() => petReact('shock'), undefined, t.shock);
    let origin = { x: window.innerWidth - 60, y: window.innerHeight - 60 };
    tl.call(() => {
      const rect = avatarRect();
      if (rect) origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.25 };
    }, undefined, t.throws[0] - 0.05);
    stars.forEach((star, i) => {
      const at = t.throws[i];
      const path = { t: 0 };
      tl.call(() => petReact('throw'), undefined, at)
        .set(star, { autoAlpha: 1 }, at)
        .to(path, {
          t: 1,
          duration: t.flight,
          ease: 'none',
          onUpdate: () => {
            // Up and over, falling onto the UFO wherever it is now.
            const p = path.t;
            const target = { x: hover.x + offset.x + (i - 1) * w * 0.15, y: hover.y + offset.y };
            const apex = Math.min(origin.y, target.y) - Math.max(90, Math.abs(target.x - origin.x) * 0.3);
            const x = origin.x + (target.x - origin.x) * p;
            const y = (1 - p) * (1 - p) * origin.y + 2 * (1 - p) * p * apex + p * p * target.y;
            gsap.set(star, { x, y, rotation: p * 540 });
          },
        }, at)
        .set(star, { autoAlpha: 0 }, at + t.flight);
    });

    // 4. Hits: the UFO flashes and shakes; the first stops the beam, the last
    //    knocks the planet out of it and leaves the UFO smoking.
    t.throws.map((at) => at + t.flight).forEach((at, i, hits) => {
      const last = i === hits.length - 1;
      tl.to(ufo, { filter: 'brightness(2.6)', duration: 0.05, yoyo: true, repeat: 1 }, at)
        .to(ufo, { x: `+=${last ? 8 : 5}`, duration: 0.04, yoyo: true, repeat: 3, ease: 'none' }, at)
        .set(flash, { left: hover.x, top: hover.y, autoAlpha: 1, scale: 0.3 }, at)
        .to(flash, { scale: last ? 1.8 : 1.1, autoAlpha: 0, duration: last ? 0.45 : 0.3, ease: 'power2.out' }, at);
    });
    tl.to(beam, { autoAlpha: 0, scaleY: 0.2, duration: 0.18, ease: 'power2.in' }, t.firstHit)
      .call(() => ufo.classList.add('is-damaged'), undefined, t.lastHit);

    // Thin smoke curling up from the top of its dome, from the last hit
    // until it is off the screen.
    puffs.forEach((puff, i) => {
      tl.call(() => {
        const box = ufo.getBoundingClientRect();
        const size = 2 + Math.random() * 3;
        gsap.fromTo(puff,
          { x: box.left + box.width * (0.46 + (Math.random() - 0.5) * 0.12), y: box.top + box.height * 0.04, width: size, height: size, autoAlpha: 0.75, scale: 1 },
          { x: `+=${(Math.random() - 0.5) * 14}`, y: `-=${18 + Math.random() * 22}`, scale: 1.8 + Math.random(), autoAlpha: 0, duration: 0.9 + Math.random() * 0.5, ease: 'power1.out' });
      }, undefined, t.lastHit + 0.1 + i * 0.075);
    });

    // 5. It limps off the screen, wobbling.
    tl.call(() => {
      offset.following = false;
      bob.kill();
      petReact('cheer');
    }, undefined, t.flee)
      .to(ufo, { rotation: exit.x > hover.x ? -16 : 16, duration: 0.3, ease: 'power2.out' }, t.flee)
      .to(ufo, { x: exit.x - w / 2, duration: t.fleeDuration, ease: 'power2.in' }, t.flee + 0.2)
      .to(ufo, { y: exit.y - h / 2, duration: t.fleeDuration, ease: 'sine.in' }, t.flee + 0.2)
      .to(ufo, { rotation: `+=${exit.x > hover.x ? 22 : -22}`, duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: 9 }, t.flee + 0.3);
    tl.to({}, { duration: 0 }, t.total);

    return () => {
      tl.kill();
      bob.kill();
      gsap.ticker.remove(track);
      gsap.killTweensOf([ufo, beam, flash, ...stars, ...puffs]);
      gsap.set([ufo, beam, flash, ...stars, ...puffs], { autoAlpha: 0 });
    };
  }, [raid]);

  return (
    <div className={`ufo-layer ${raid ? 'is-active' : ''}`} aria-hidden="true">
      <div ref={followRef} className="ufo-follow">
        <div ref={beamRef} className="ufo-beam" />
        <div ref={ufoRef} className="ufo">
          <UfoSprite />
        </div>
        <div ref={flashRef} className="ufo-hit" />
      </div>
      <div ref={smokeRef}>
        {Array.from({ length: puffCount }, (_, i) => <i key={i} className="ufo-puff" />)}
      </div>
      <div ref={starsRef}>
        {Array.from({ length: 3 }, (_, i) => <i key={i} className="ufo-star" />)}
      </div>
    </div>
  );
};
