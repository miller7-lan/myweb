import { themes } from '../data/themes';
import { useGalaxyStore } from '../store/useGalaxyStore';

/*
 * The easter egg once every planet is lit.
 *
 * Back in the galaxy after the last planet, 星仔 cheers and calls the
 * visitor along (cheer, call). It drops through a hole under itself, pops
 * out below the centre star, which has turned into a black hole, and walks
 * in; the hole collapses after it (leave). The view pulls straight back,
 * out through countless galaxies like this one (out), to an empty stretch
 * of space where particles gather from all around into
 * 「总有一个星系属于你」 (form), with 返回星系 under it.
 *
 * 返回星系 (or Esc) opens a black hole that swallows the sentence. A giant
 * 星仔 climbs out of it and waves at the screen (wave), turns its back,
 * reaches a hand back to the visitor and pulls the view home through the
 * galaxies (home), shrinking back to its own size and spot as the galaxy
 * comes up (land).
 *
 * GalaxyScene makes the plan, FinaleSequence runs the timeline and draws
 * 星仔, the holes and the sentence, and FinaleFlight flies the camera
 * through the galaxies from finaleTrack. Silent mode and reduced motion
 * skip the flight: the galaxy fades out behind the sentence and back in.
 * Times in seconds.
 */
export const finaleTiming = {
  /** After the galaxy is back: 星仔 cheers, then they set off. */
  cheer: 0.6,
  call: 1.7,
  /** The view pulls back once the hole has collapsed, and the sentence gathers as it slows down. */
  out: 5.6,
  form: 2.6,
  /** After 返回星系: the hole swallows the sentence and 星仔 climbs out. */
  swallow: 1.1,
  wave: 1.6,
  /** The flight home, and 星仔 shrinking back into its spot at the end of it. */
  home: 4.8,
  land: 1.1,
};

/** How far the view pulls back, in scene units (the camera starts about 20 from the centre star). */
export const finaleDepth = 800;

/**
 * What FinaleFlight reads every frame: how far the camera has pulled back
 * along its line of sight, how visible the galaxies along the way are
 * (0–1), and whether this galaxy is drawn (it is hidden while it is only a
 * speck far behind). FinaleSequence tweens it.
 */
export const finaleTrack = { distance: 0, field: 0, home: true };

/** Every planet's colour: the holes' rings and some of the sentence's particles. */
export const finaleColors = Object.values(themes).map((theme) => theme.color);

export const canStartFinale = () => {
  const { viewState, introPlaying, portal, raid, finale } = useGalaxyStore.getState();
  return (viewState === 'HOME' || viewState === 'HOVER_PLANET') && !introPlaying && !portal && !raid && !finale;
};

/** Silent mode or reduced motion: no flight. */
export const isShortFinale = () =>
  useGalaxyStore.getState().visualMode === 'silent' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
