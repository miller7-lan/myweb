import * as THREE from 'three';
import gsap from 'gsap';
import { useGalaxyStore, type PortalPlan, type TransitionStyle } from '../store/useGalaxyStore';

/*
 * The black-hole transition between the galaxy and a theme page.
 *
 * Entering: 星仔 opens a small black hole under itself, drops through it and
 * pops out of a second one beside the planet (summon). A black hole opens on
 * the planet and swallows it, then grows over the whole screen (swallow).
 * The page is revealed by the hole bursting open into a ring of the theme's
 * colour (reveal).
 * Leaving (the same after A or B): 星仔 slips into a small hole, the page
 * closes into the planet's spot (close), the hole there spits the planet back
 * out into its orbit (spit), and 星仔 climbs back out at its own spot.
 *
 * ThemePlanet makes the plan (it knows where the planet is on screen) and
 * runs the 3D half; PortalTransition draws the holes, the veil and 星仔.
 * Both read the same timings, in seconds. The 动效 setting plays the black
 * hole or the wormhole at random; 简短 (or Silent mode, or reduced motion)
 * skips 星仔 and plays a quick black hole.
 */

const timings: Record<TransitionStyle, PortalPlan['timing']> = {
  full: { lead: 0, summon: 1.4, swallow: 1.05, reveal: 0.8, close: 0.6, spit: 0.92 },
  // B: the centre star becomes a black hole and 星仔 is summoned beside it;
  // then (swallow) 星仔 walks in, every particle is pulled in after it and
  // the stars stretch into a tunnel; the page comes out of it (reveal).
  // First (lead) the centre star shoots a dashed line at the planet and
  // reels it in; the planet sinks into it and dyes it the theme's colour.
  wormhole: { lead: 1.6, summon: 1.4, swallow: 2.35, reveal: 0.9, close: 0.75, spit: 1.1 },
  short: { lead: 0, summon: 0, swallow: 0.45, reveal: 0.6, close: 0.35, spit: 0.45 },
};

/** Within the wormhole's swallow: when (s after the summon) and for how long everything is pulled into the hole. */
export const wormholePull = { start: 0.4, duration: 1.3 };

/** When everything takes the planet's colour as it is pulled into the wormhole. */
export const wormholeTintAt = (plan: PortalPlan) => plan.timing.lead + plan.timing.summon + wormholePull.start - 0.15;

/** When the reeled-in planet sinks into the centre star (s after the click). */
export const tetherImpactAt = (plan: PortalPlan) => plan.timing.lead - 0.24;

/**
 * The wormhole's opening: the dashed line between the centre star and the
 * planet, on screen in CSS px. ThemePlanet writes it every frame while the
 * line is out; CoreTether draws it. reach 0-1 is how far the line has shot
 * out, tension 0-1 how taut it is.
 */
export const tetherTrack = { active: false, x1: 0, y1: 0, r1: 0, x2: 0, y2: 0, r2: 0, reach: 0, tension: 0, color: '#ffffff' };

declare global {
  interface WindowEventMap {
    'galaxy-core-ripple': CustomEvent<{ x: number; y: number; r: number; color: string }>;
  }
}

/** The planet has sunk into the centre star: a ring of its colour spreads out from there. */
export const rippleCore = (detail: { x: number; y: number; r: number; color: string }) => {
  window.dispatchEvent(new CustomEvent('galaxy-core-ripple', { detail }));
};

/**
 * Tints a particle material (shaders/particles.ts) to `color`, or (null)
 * back to `rest`. The shader shows uGlowColor in full while uIsHovered is 1.
 */
export const tintParticles = (
  uniforms: Record<string, THREE.IUniform>,
  color: string | null,
  rest: { color: string; glow: string },
  delay = 0,
) => {
  const { uColor, uGlowColor, uHoverBrightness, uIsHovered } = uniforms;
  gsap.killTweensOf([uColor.value, uGlowColor.value, uHoverBrightness]);
  if (color) {
    const tint = new THREE.Color(color);
    gsap.delayedCall(delay, () => { uIsHovered.value = 1; });
    gsap.to(uColor.value, { r: tint.r, g: tint.g, b: tint.b, delay, duration: 0.5, ease: 'power2.out' });
    gsap.to(uGlowColor.value, { r: tint.r, g: tint.g, b: tint.b, delay, duration: 0.5, ease: 'power2.out' });
    gsap.to(uHoverBrightness, { value: 0.8, delay, duration: 0.5, ease: 'power2.out' });
    return;
  }
  uIsHovered.value = 0;
  uColor.value.set(rest.color);
  uGlowColor.value.set(rest.glow);
  uHoverBrightness.value = 0;
};

let nextId = 1;

export const effectiveTransitionStyle = (): TransitionStyle => {
  const { transitionStyle, visualMode } = useGalaxyStore.getState();
  if (transitionStyle === 'short' || visualMode === 'silent') return 'short';
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'short';
  return 'full';
};

// The full setting picks A or B at random for each visit. The way back is
// the same for both: 星仔 slips into a small hole, the page closes into the
// planet's spot, and 星仔 comes back out of a hole at its own spot.
const styleFor = (kind: PortalPlan['kind']): TransitionStyle => {
  const base = effectiveTransitionStyle();
  if (base === 'short' || kind === 'leave') return base;
  return Math.random() < 0.5 ? 'full' : 'wormhole';
};

const petRect = (): PortalPlan['pet'] => {
  const avatar = document.querySelector<HTMLElement>('.guide-pet-shell .guide-pet-avatar');
  if (!avatar) return null;
  const rect = avatar.getBoundingClientRect();
  const onScreen = rect.width > 0 && rect.right > 8 && rect.left < window.innerWidth - 8 && rect.bottom > 8 && rect.top < window.innerHeight - 8;
  return onScreen ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height } : null;
};

export const makePortalPlan = (
  kind: PortalPlan['kind'],
  point: { x: number; y: number; r: number },
  color: string,
  core: PortalPlan['core'] = null,
): PortalPlan => {
  const style = styleFor(kind);
  const pet = style !== 'short' ? petRect() : null;
  const timing = { ...timings[style] };
  if (!pet) timing.summon = 0;
  return { id: nextId++, kind, style, ...point, color, core, pet, timing };
};
