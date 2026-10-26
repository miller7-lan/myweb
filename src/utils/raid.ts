import { useGalaxyStore } from '../store/useGalaxyStore';

/*
 * The UFO easter egg. Now and then (or from the UFO button) a pixel UFO
 * flies in, hovers over a random planet and pulls its particles up its
 * beam. 星仔 jumps in shock, throws three stars at it, and the last one
 * knocks the planet back out: its particles fall back and gather again
 * while the UFO limps off screen, smoke rising from its dome.
 *
 * GalaxyScene picks the planet and makes the plan, ThemePlanet runs the
 * planet's half, UfoRaid draws the rest. Times in seconds.
 */
export const raidTiming = {
  arrive: 1.5,
  beam: 1.5,
  suck: 1.7,
  shock: 2.1,
  throws: [3.0, 3.22, 3.44],
  flight: 0.5,
  /** The first star stops the beam, the last one knocks the planet out. */
  firstHit: 3.5,
  lastHit: 3.94,
  regather: 1.8,
  flee: 4.1,
  fleeDuration: 2.5,
  total: 6.9,
};

/**
 * Where the raided planet is on screen right now (CSS px). The planet keeps
 * to its orbit (or stands still when the planets stop), and the UFO and its
 * beam follow it; ThemePlanet writes this every frame.
 */
export const raidTrack = { x: 0, y: 0 };

/** About once a minute. */
export const nextRaidDelay = () => 45000 + Math.random() * 30000;

export const canRaid = () => {
  const { viewState, introPlaying, portal, raid } = useGalaxyStore.getState();
  return (viewState === 'HOME' || viewState === 'HOVER_PLANET') && !introPlaying && !portal && !raid;
};

/** What UfoRaid asks 星仔 (GuidePet) to do. */
export type PetReaction = 'shock' | 'throw' | 'cheer';

declare global {
  interface WindowEventMap {
    'galaxy-pet-react': CustomEvent<{ reaction: PetReaction }>;
  }
}

export const petReact = (reaction: PetReaction) => {
  window.dispatchEvent(new CustomEvent('galaxy-pet-react', { detail: { reaction } }));
};
