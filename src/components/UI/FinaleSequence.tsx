import React, { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowLeft } from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { PetSprite } from './GuidePet';
import { PixelHole } from './PortalTransition';
import { createParticleText } from '../../utils/particleText';
import { canStartFinale, finaleColors, finaleDepth, finaleTiming, finaleTrack } from '../../utils/finale';
import { hopThroughHoles, petRect } from '../../utils/portal';
import { petReact, petSay } from '../../utils/raid';

/*
 * The DOM half of the finale (see utils/finale.ts for the story and the
 * timings). The timelines here also tween finaleTrack, which FinaleFlight
 * turns into the camera's flight. It reuses the black-hole transition's
 * hole, pixel holes and 星仔 stand-in. While it runs the layer takes every
 * pointer event: a tap skips a flight, and 返回星系 (or Esc) heads home.
 */

type Phase = 'out' | 'away' | 'back';

const sentence = { wide: ['总有一个星系属于你'], narrow: ['总有一个星系', '属于你'] };

// The holes' rings: every planet's colour, swirling.
const finaleRing = `conic-gradient(from 0deg, ${finaleColors
  .map((color, i) => `transparent ${i * 72}deg, ${color} ${i * 72 + 40}deg`)
  .join(', ')}, transparent 360deg)`;

/** The giant 星仔 (PetSprite is 20 × 18): most of the screen's height, never wider than it. */
const giantSize = (W: number, H: number) => {
  const height = Math.min(H * 0.56, W * 0.72);
  return { width: height * (20 / 18), height };
};

const armBlocks = 40;

const placeBlock = (rect: SVGRectElement, x: number, y: number, size: number) => {
  rect.setAttribute('x', x.toFixed(1));
  rect.setAttribute('y', y.toFixed(1));
  rect.setAttribute('width', size.toFixed(1));
  rect.setAttribute('height', size.toFixed(1));
};

/**
 * 星仔's arm reaching back to the visitor, from its shoulder to `hand`
 * (just past the bottom of the screen): pixel blocks on the sprite's grid,
 * thickening as the arm comes closer. `reach` 0–1 is how far it is out.
 */
const drawArm = (
  shades: SVGRectElement[],
  fills: SVGRectElement[],
  shoulder: { x: number; y: number },
  hand: { x: number; y: number },
  unit: number,
  reach: number,
) => {
  const end = { x: shoulder.x + (hand.x - shoulder.x) * reach, y: shoulder.y + (hand.y - shoulder.y) * reach };
  const length = Math.hypot(end.x - shoulder.x, end.y - shoulder.y);
  const used = reach > 0 ? Math.min(armBlocks, Math.max(1, Math.round(length / (unit * 0.75)))) : 0;
  for (let i = 0; i < armBlocks; i += 1) {
    if (i >= used) {
      shades[i].setAttribute('width', '0');
      fills[i].setAttribute('width', '0');
      continue;
    }
    const t = used === 1 ? 0 : i / (used - 1);
    const size = unit * Math.round(2 + 2.5 * t * reach);
    const x = shoulder.x + Math.round(((end.x - shoulder.x) * t) / unit) * unit - size / 2;
    const y = shoulder.y + Math.round(((end.y - shoulder.y) * t) / unit) * unit - size / 2;
    placeBlock(shades[i], x, y + unit * 0.6, size);
    placeBlock(fills[i], x, y, size);
  }
};

// Back in the galaxy right after the last planet lit up: 星仔 cheers, calls
// the visitor along and sets off.
const useAutoStart = () => {
  const completionPulseId = useGalaxyStore((state) => state.completionPulseId);
  const viewState = useGalaxyStore((state) => state.viewState);
  const portal = useGalaxyStore((state) => state.portal);
  const introPlaying = useGalaxyStore((state) => state.introPlaying);
  const raid = useGalaxyStore((state) => state.raid);
  const finale = useGalaxyStore((state) => state.finale);
  const atHome = viewState === 'HOME' || viewState === 'HOVER_PLANET';
  const startedFor = useRef(0);

  useEffect(() => {
    // Replayed from the HUD before it set off by itself: that counts.
    if (finale) {
      startedFor.current = completionPulseId;
      return;
    }
    if (completionPulseId <= startedFor.current || !atHome || portal || introPlaying || raid) return;
    const cheer = window.setTimeout(() => {
      petReact('cheer');
      petSay('全部点亮啦，跟我来！');
    }, finaleTiming.cheer * 1000);
    const go = window.setTimeout(() => {
      if (canStartFinale()) useGalaxyStore.getState().requestFinale();
    }, (finaleTiming.cheer + finaleTiming.call) * 1000);
    return () => {
      window.clearTimeout(cheer);
      window.clearTimeout(go);
    };
  }, [atHome, completionPulseId, finale, introPlaying, portal, raid]);
};

export const FinaleSequence: React.FC = () => {
  const finale = useGalaxyStore((state) => state.finale);
  const rootRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const holeCoreRef = useRef<HTMLDivElement>(null);
  const holeARef = useRef<HTMLDivElement>(null);
  const holeBRef = useRef<HTMLDivElement>(null);
  const petRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<SVGSVGElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const skipHintRef = useRef<HTMLParagraphElement>(null);
  // Set by the running finale: head home from the empty place, or skip the flight under way.
  const goHomeRef = useRef<(() => void) | null>(null);
  const skipRef = useRef<(() => void) | null>(null);

  useAutoStart();

  useLayoutEffect(() => {
    const root = rootRef.current;
    const veil = veilRef.current;
    const canvas = textRef.current;
    const flash = flashRef.current;
    const hole = holeRef.current;
    const holeCore = holeCoreRef.current;
    const holeA = holeARef.current;
    const holeB = holeBRef.current;
    const pet = petRef.current;
    const avatar = avatarRef.current;
    const arm = armRef.current;
    const actions = actionsRef.current;
    const skipHint = skipHintRef.current;
    if (!finale || !root || !veil || !canvas || !flash || !hole || !holeCore || !holeA || !holeB || !pet || !avatar || !arm || !actions || !skipHint) return;

    const html = document.documentElement;
    const { core, short } = finale;
    const shades = Array.from(arm.querySelectorAll<SVGRectElement>('.arm-shade'));
    const fills = Array.from(arm.querySelectorAll<SVGRectElement>('.arm-fill'));
    const makeText = () => createParticleText(canvas, {
      lines: window.innerWidth < 640 ? sentence.narrow : sentence.wide,
      colors: finaleColors,
      fine: window.innerWidth < 768,
    });
    let text = makeText();
    let phase: Phase = 'out';
    let back: gsap.core.Timeline | null = null;
    let armTick: (() => void) | null = null;

    const placeActions = () => gsap.set(actions, { top: text.layout.bottom + 28 });
    const stopArm = () => {
      if (armTick) gsap.ticker.remove(armTick);
      armTick = null;
      gsap.set(arm, { autoAlpha: 0 });
    };

    root.style.setProperty('--finale-ring', finaleRing);
    html.classList.add('pet-portaling');
    gsap.set([veil, flash, hole, holeA, holeB, pet, arm, actions, skipHint], { autoAlpha: 0, clearProps: 'transform' });
    gsap.set(avatar, { clearProps: 'transform' });
    gsap.set(canvas, { autoAlpha: 1 });
    gsap.set(holeCore, { opacity: 0 });
    gsap.set(actions, { y: 10 });
    placeActions();
    text.start();

    const arrive = () => {
      phase = 'away';
      buttonRef.current?.focus({ preventScroll: true });
    };

    const finish = () => {
      stopArm();
      html.classList.remove('pet-portaling');
      useGalaxyStore.getState().setFinale(null);
    };

    const out = gsap.timeline();
    if (short) {
      // No flight: the galaxy fades out behind the sentence.
      text.state.form = 1;
      text.state.alpha = 0;
      if (finale.pet) {
        const { x, y, width, height } = finale.pet;
        gsap.set(pet, { left: x, top: y, width, height, scale: 1, rotation: 0, y: 0, autoAlpha: 1 });
        out.to(pet, { autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, 0);
      }
      out.to(veil, { autoAlpha: 1, duration: 0.8, ease: 'power1.inOut' }, 0.1)
        .to(text.state, { alpha: 1, stars: 1, duration: 1, ease: 'power1.out' }, 0.7)
        .to(actions, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.4)
        .call(arrive, undefined, 1.9);
    } else {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const holeSize = Math.max(core.r * 2.2, 96);

      // 1. The centre star becomes a black hole.
      gsap.set(hole, { width: holeSize, height: holeSize, left: core.x - holeSize / 2, top: core.y - holeSize / 2, scale: 0, rotation: 0 });
      out.to(hole, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'back.out(1.3)' }, 0.1)
        .to(holeCore, { opacity: 1, duration: 0.7, ease: 'power1.in' }, 0.2);

      // 2. 星仔 drops through a hole under itself, pops out below the black hole and walks in.
      let collapseAt = 1;
      if (finale.pet) {
        const { x, y, width: w, height: h } = finale.pet;
        const landing = {
          x: Math.min(Math.max(core.x, w / 2 + 8), W - w / 2 - 8),
          y: Math.min(Math.max(core.y + holeSize * 0.5 + h * 0.45, h / 2 + 8), H - h / 2 - 8),
        };
        gsap.set(pet, { left: x, top: y, width: w, height: h, scale: 1, rotation: 0, y: 0 });
        out.set(pet, { autoAlpha: 1 }, 0)
          .add(hopThroughHoles(pet, holeA, holeB, finale.pet, landing), 0)
          .call(() => pet.classList.add('is-back', 'is-walking'), undefined, 1.15)
          .to(pet, { left: core.x - w / 2, top: core.y - h / 2, scale: 0.18, duration: 0.65, ease: 'power1.in' }, 1.15)
          .set(pet, { autoAlpha: 0 }, 1.8)
          .call(() => pet.classList.remove('is-back', 'is-walking'), undefined, 1.8);
        collapseAt = 1.85;
      }

      // 3. The hole collapses after it with a flash.
      const flashSize = holeSize * 1.4;
      gsap.set(flash, { width: flashSize, height: flashSize, left: core.x - flashSize / 2, top: core.y - flashSize / 2, scale: 0.2 });
      out.to(hole, { scale: 1.15, duration: 0.15, ease: 'power2.out' }, collapseAt)
        .to(hole, { scale: 0, rotation: 200, duration: 0.3, ease: 'power2.in' }, collapseAt + 0.15)
        .set(hole, { autoAlpha: 0 }, collapseAt + 0.45)
        .set(flash, { autoAlpha: 1 }, collapseAt + 0.42)
        .to(flash, { scale: 2.4, duration: 0.8, ease: 'expo.out' }, collapseAt + 0.42)
        .to(flash, { autoAlpha: 0, duration: 0.6, ease: 'power1.in' }, collapseAt + 0.62);

      // 4. The view pulls back through the galaxies to an empty stretch of space.
      const pullAt = collapseAt + 0.3;
      out.to(skipHint, { autoAlpha: 1, duration: 0.6 }, pullAt)
        .to(finaleTrack, { distance: finaleDepth, duration: finaleTiming.out, ease: 'power3.inOut' }, pullAt)
        .to(finaleTrack, { field: 1, duration: 0.8, ease: 'power1.out' }, pullAt + 0.25)
        .call(() => { finaleTrack.home = false; }, undefined, pullAt + finaleTiming.out * 0.72)
        .to(finaleTrack, { field: 0, duration: 1.4, ease: 'power1.inOut' }, pullAt + finaleTiming.out - 1.3);

      // 5. The sentence gathers out of the dark as the view slows down.
      const formAt = pullAt + finaleTiming.out - 1.1;
      out.to(skipHint, { autoAlpha: 0, duration: 0.4 }, formAt)
        .to(text.state, { stars: 1, duration: 1.6, ease: 'power1.out' }, formAt - 0.2)
        .to(text.state, { form: 1, duration: finaleTiming.form, ease: 'none' }, formAt)
        .to(actions, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, formAt + finaleTiming.form - 0.2)
        .call(arrive, undefined, formAt + finaleTiming.form + 0.4);
    }

    const goHome = () => {
      if (phase !== 'away') return;
      phase = 'back';
      back = gsap.timeline({ onComplete: finish });
      back.to(actions, { autoAlpha: 0, duration: 0.25, ease: 'power1.in' }, 0);

      if (short) {
        back.to(text.state, { alpha: 0, duration: 0.6, ease: 'power1.in' }, 0)
          .to(veil, { autoAlpha: 0, duration: 0.8, ease: 'power1.inOut' }, 0.4);
        return;
      }

      const W = window.innerWidth;
      const H = window.innerHeight;
      const giant = giantSize(W, H);
      const unit = giant.width / 20;

      // 1. A black hole opens in the middle of the sentence and swallows it.
      const cx = W / 2;
      const cy = text.layout.centerY;
      const holeSize = Math.min(W, H) * 0.34;
      text.state.sx = cx;
      text.state.sy = cy;
      gsap.set(hole, { width: holeSize, height: holeSize, left: cx - holeSize / 2, top: cy - holeSize / 2, scale: 0, rotation: 0 });
      gsap.set(holeCore, { opacity: 1 });
      back.to(hole, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.4)' }, 0.05)
        .to(text.state, { swallow: 1, duration: finaleTiming.swallow, ease: 'power2.in' }, 0.25)
        .to(text.state, { stars: 0, duration: 0.8, ease: 'power1.in' }, 0.3);

      // 2. 星仔 climbs out of it, giant, and waves at the screen.
      const emergeAt = 0.15 + finaleTiming.swallow;
      const waveAt = emergeAt + 0.75;
      gsap.set(pet, { left: cx - giant.width / 2, top: cy - giant.height / 2, width: giant.width, height: giant.height, scale: 0, rotation: -300, y: 0 });
      back.call(() => pet.classList.add('is-giant'), undefined, emergeAt)
        .set(pet, { autoAlpha: 1 }, emergeAt)
        .to(pet, { scale: 1, rotation: 0, top: H * 0.5 - giant.height / 2, duration: 0.75, ease: 'back.out(1.4)' }, emergeAt)
        .to(hole, { scale: 0, rotation: 160, duration: 0.4, ease: 'power2.in' }, emergeAt + 0.45)
        .set(hole, { autoAlpha: 0 }, emergeAt + 0.85)
        .call(() => pet.classList.add('is-wave'), undefined, waveAt)
        .to(pet, { y: -giant.height * 0.035, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 3 }, waveAt)
        .call(() => pet.classList.remove('is-wave'), undefined, waveAt + finaleTiming.wave);

      // 3. It turns its back, moves ahead a little and reaches a hand back to the visitor.
      const turnAt = waveAt + finaleTiming.wave;
      const leadScale = 0.8;
      const lead = { x: W * 0.44, y: H * 0.92 - (giant.height * leadScale) / 2 };
      const hand = { x: W * 0.62, y: H + unit * 3 };
      const reach = { value: 0 };
      back.to(avatar, { scaleX: 0.06, duration: 0.14, ease: 'power1.in' }, turnAt)
        .call(() => pet.classList.add('is-back', 'is-flying'), undefined, turnAt + 0.14)
        .to(avatar, { scaleX: 1, duration: 0.16, ease: 'power1.out' }, turnAt + 0.14)
        .to(pet, { left: lead.x - giant.width / 2, top: lead.y - giant.height / 2, scale: leadScale, duration: 0.55, ease: 'power2.inOut' }, turnAt + 0.1)
        .call(() => {
          const u = unit * leadScale;
          // Its right arm hangs from (18, 8) on the sprite; the sprite's centre is (10, 9).
          armTick = () => drawArm(shades, fills, { x: lead.x + 8 * u, y: lead.y - u + Number(gsap.getProperty(pet, 'y')) }, hand, u, reach.value);
          gsap.ticker.add(armTick);
          pet.classList.add('is-reaching');
          gsap.set(arm, { autoAlpha: 1 });
        }, undefined, turnAt + 0.6)
        .to(reach, { value: 1, duration: 0.35, ease: 'power2.out' }, turnAt + 0.6);

      // 4. ...and pulls the view home through the galaxies.
      const flyAt = turnAt + 0.75;
      const landAt = flyAt + finaleTiming.home - finaleTiming.land;
      back.call(() => { finaleTrack.home = true; }, undefined, flyAt - 0.1)
        .to(skipHint, { autoAlpha: 1, duration: 0.5 }, flyAt)
        .to(finaleTrack, { field: 1, duration: 0.6, ease: 'power1.out' }, flyAt)
        .to(finaleTrack, { distance: 0, duration: finaleTiming.home, ease: 'power3.inOut' }, flyAt)
        .to(finaleTrack, { field: 0, duration: 0.9, ease: 'power1.in' }, flyAt + finaleTiming.home - 1.2)
        .to(pet, { y: -giant.height * leadScale * 0.03, duration: 0.42, ease: 'sine.inOut', yoyo: true, repeat: 7 }, flyAt);

      // 5. Nearly home: it lets go, turns round, shrinks back to its own size
      //    and lands in its spot (where the real 星仔, hidden, is still laid
      //    out: its sprite fills the top of that box).
      const spot = petRect() ?? { x: W - 84, y: H - 84, width: 72, height: 72 };
      const spotScale = spot.width / giant.width;
      back.to(skipHint, { autoAlpha: 0, duration: 0.4 }, landAt)
        .to(reach, { value: 0, duration: 0.22, ease: 'power2.in' }, landAt)
        .call(() => {
          stopArm();
          pet.classList.remove('is-reaching');
        }, undefined, landAt + 0.22)
        .to(pet, {
          left: spot.x + spot.width / 2 - giant.width / 2,
          top: spot.y + (spot.width * 0.9) / 2 - giant.height / 2,
          scale: spotScale,
          duration: finaleTiming.land - 0.25,
          ease: 'power2.inOut',
        }, landAt + 0.12)
        .to(avatar, { scaleX: 0.06, duration: 0.12, ease: 'power1.in' }, landAt + 0.35)
        .call(() => pet.classList.remove('is-back', 'is-flying', 'is-giant'), undefined, landAt + 0.47)
        .to(avatar, { scaleX: 1, duration: 0.14, ease: 'power1.out' }, landAt + 0.47)
        .to(avatar, { scaleX: 1.12, scaleY: 0.84, transformOrigin: '50% 100%', duration: 0.08, ease: 'power1.out', yoyo: true, repeat: 1 }, landAt + finaleTiming.land - 0.13)
        .call(() => {
          gsap.set(pet, { autoAlpha: 0 });
          html.classList.remove('pet-portaling');
          petReact('cheer');
        }, undefined, landAt + finaleTiming.land + 0.05);
    };
    goHomeRef.current = goHome;

    const skip = () => {
      if (phase === 'out') out.progress(1);
      else if (phase === 'back') back?.progress(1);
    };
    skipRef.current = skip;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (phase === 'away') goHome();
      else skip();
    };
    // A new screen size while the sentence is up: lay it out again, already gathered.
    const handleResize = () => {
      if (phase !== 'away') return;
      text.stop();
      text = makeText();
      text.state.form = 1;
      text.state.stars = 1;
      placeActions();
      text.start();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      out.kill();
      back?.kill();
      stopArm();
      text.stop();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      goHomeRef.current = null;
      skipRef.current = null;
      pet.classList.remove('is-back', 'is-walking', 'is-giant', 'is-wave', 'is-flying', 'is-reaching');
      gsap.set([veil, canvas, flash, hole, holeA, holeB, pet, actions, skipHint], { autoAlpha: 0 });
      html.classList.remove('pet-portaling');
    };
  }, [finale]);

  return (
    <div
      ref={rootRef}
      className={`portal-layer finale-layer ${finale ? 'is-running' : ''}`}
      onPointerDown={(event) => {
        if (!(event.target instanceof Element) || !event.target.closest('.finale-actions')) skipRef.current?.();
      }}
      aria-hidden={!finale}
    >
      <div ref={veilRef} className="finale-veil" />
      <canvas ref={textRef} className="finale-text" role="img" aria-label="总有一个星系属于你" />
      <div ref={flashRef} className="finale-flash" />
      <div ref={holeRef} className="portal-hole">
        <div className="portal-hole-disk" />
        <div ref={holeCoreRef} className="portal-hole-core" />
      </div>
      <PixelHole holeRef={holeARef} />
      <PixelHole holeRef={holeBRef} />
      <div ref={petRef} className="portal-pet finale-pet">
        <div ref={avatarRef} className="guide-pet-avatar">
          <PetSprite />
        </div>
      </div>
      <svg ref={armRef} className="finale-arm" shapeRendering="crispEdges" aria-hidden="true">
        {Array.from({ length: armBlocks }, (_, i) => <rect key={`shade-${i}`} className="arm-shade" width="0" height="0" />)}
        {Array.from({ length: armBlocks }, (_, i) => <rect key={`fill-${i}`} className="arm-fill" width="0" height="0" />)}
      </svg>
      <div ref={actionsRef} className="finale-actions">
        <button ref={buttonRef} type="button" className="finale-return" onClick={() => goHomeRef.current?.()}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>返回星系</span>
        </button>
      </div>
      <p ref={skipHintRef} className="finale-skip">轻点任意处跳过</p>
    </div>
  );
};
