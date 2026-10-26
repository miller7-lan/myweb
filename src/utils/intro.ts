/*
 * The opening animation, played each time the site is opened.
 *
 * A black hole is born on the centre star and spits 星仔 out (birth). 星仔
 * throws a spark at each planet in turn, left to right, and each planet's
 * particles gather where the spark lands (light). Then the black hole
 * collapses, the centre star gathers out of the particles, the rings spread
 * out of it and the ship is assembled out of ring particles, while 星仔 walks
 * from the centre to its usual spot. A tap skips it.
 *
 * GalaxyScene finds where everything is on screen and gathers the particles;
 * IntroSequence draws the hole, 星仔 and the sparks. Both read these
 * timings, in seconds.
 */
export const introTiming = {
  /** 星仔 comes out of the hole. */
  spit: 0.7,
  /** The first spark leaves 星仔; the next ones follow every `gap`. */
  light: 1.45,
  gap: 0.22,
  flight: 0.4,
  /** How long a planet's particles take to gather. */
  gather: 0.85,
  /** The hole collapses and the centre star gathers. */
  collapse: 2.65,
  core: 2.85,
  coreGather: 0.95,
  /** The rings spread out of the centre star. */
  ring: 3.25,
  ringGrow: 1.15,
  /** The ship is assembled out of ring particles in layers (RingShip), about 2.5s. */
  ship: 3.3,
  /** 星仔 walks from below the centre star to its usual spot. */
  walk: 2.95,
  walkDuration: 1.9,
  /** The page's own UI fades back in once the rings and ship are done. */
  ui: 5.5,
  total: 5.85,
};

/**
 * Both timelines play at this speed: the timings above are choreographed at
 * 5.85s, and 0.65 stretches the whole thing to about 9s.
 */
export const introSpeed = 0.65;

/** When the spark for planet `index` lands on it. */
export const lightAt = (index: number) => introTiming.light + index * introTiming.gap + introTiming.flight;
