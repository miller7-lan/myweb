import { create } from 'zustand';

export type ViewState = 'HOME' | 'HOVER_PLANET' | 'ENTERING_THEME' | 'THEME' | 'LEAVING_THEME';
export type ThemeKey = 'identity' | 'creations' | 'stack' | 'orbit' | 'signal' | null;
export type NonNullThemeKey = Exclude<ThemeKey, null>;
export type VisualMode = 'cinematic' | 'focus' | 'silent';
/** The menu setting: full plays the black hole or the wormhole at random, short a quick black hole. */
export type TransitionSetting = 'full' | 'short';
/** What one transition actually plays: full = the black hole (A), wormhole = B. */
export type TransitionStyle = 'full' | 'wormhole' | 'short';

/** One run of the black-hole transition between the galaxy and a theme page (see utils/portal.ts). */
export interface PortalPlan {
  id: number;
  kind: 'enter' | 'leave';
  style: TransitionStyle;
  /** The planet on screen: centre and radius in CSS px. */
  x: number;
  y: number;
  r: number;
  color: string;
  /** The galaxy's centre star on screen (the wormhole starts there). */
  core: { x: number; y: number; r: number } | null;
  /** Where 星仔 stands when it is summoned; null skips its part. */
  pet: { x: number; y: number; width: number; height: number } | null;
  timing: { summon: number; swallow: number; reveal: number; close: number; spit: number };
}

/** Where the opening animation's pieces are on screen, in CSS px (see utils/intro.ts). */
export interface IntroPoints {
  core: { x: number; y: number; r: number };
  /** In the order they light up. */
  planets: Array<{ key: ThemeKey; x: number; y: number; r: number; color: string }>;
}

/** One visit of the UFO (see utils/raid.ts). Screen points in CSS px. */
export interface RaidPlan {
  id: number;
  planet: NonNullThemeKey;
  color: string;
  /** The planet on screen. */
  x: number;
  y: number;
  r: number;
  /** Where the UFO hovers, and that spot in the 3D scene at the planet's depth. */
  hover: { x: number; y: number };
  hoverWorld: [number, number, number];
  /** Where it flies in from and where it flees to (off screen). */
  from: { x: number; y: number };
  exit: { x: number; y: number };
}

const themeKeys: NonNullThemeKey[] = ['identity', 'creations', 'stack', 'orbit', 'signal'];
export const themeCount = themeKeys.length;

interface GalaxyState {
  viewState: ViewState;
  hoveredPlanet: ThemeKey;
  activeTheme: ThemeKey;
  visitedThemes: Partial<Record<NonNullThemeKey, boolean>>;
  visitSequence: NonNullThemeKey[];
  lastVisitedTheme: ThemeKey;
  completionPulseId: number;
  coreFireworkId: number;
  visualMode: VisualMode;
  planetPositions: Partial<Record<NonNullThemeKey, [number, number, number]>>;
  transitionStyle: TransitionSetting;
  portal: PortalPlan | null;
  /** The opening animation plays once each time the site is opened. */
  introPlaying: boolean;
  introPoints: IntroPoints | null;
  /** Bumped to ask for a UFO visit; GalaxyScene answers with `raid`. */
  raidRequest: number;
  raid: RaidPlan | null;
  setViewState: (state: ViewState) => void;
  setHoveredPlanet: (theme: ThemeKey) => void;
  setActiveTheme: (theme: ThemeKey) => void;
  visitTheme: (theme: NonNullThemeKey) => void;
  triggerCoreFirework: () => void;
  setVisualMode: (mode: VisualMode) => void;
  setPlanetPosition: (theme: NonNullThemeKey, x: number, y: number, z: number) => void;
  setTransitionStyle: (style: TransitionSetting) => void;
  setPortal: (portal: PortalPlan | null) => void;
  setIntroPoints: (points: IntroPoints) => void;
  finishIntro: () => void;
  requestRaid: () => void;
  setRaid: (raid: RaidPlan | null) => void;
}

const readInitialVisualMode = (): VisualMode => {
  if (typeof window === 'undefined') return 'cinematic';
  const storedMode = window.localStorage.getItem('galaxy-visual-mode');
  return storedMode === 'focus' || storedMode === 'silent' || storedMode === 'cinematic'
    ? storedMode
    : 'cinematic';
};

const readInitialTransitionStyle = (): TransitionSetting => {
  if (typeof window === 'undefined') return 'full';
  try {
    return window.localStorage.getItem('galaxy-transition-style') === 'short' ? 'short' : 'full';
  } catch {
    return 'full';
  }
};

// Plays every time the site is opened, unless the system asks for reduced motion.
const readIntroPlaying = (): boolean =>
  typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const markThemeVisited = (state: GalaxyState, theme: NonNullThemeKey) => {
  const wasVisited = Boolean(state.visitedThemes[theme]);
  const visitedThemes = {
    ...state.visitedThemes,
    [theme]: true,
  };
  const visitSequence = wasVisited ? state.visitSequence : [...state.visitSequence, theme];
  const wasComplete = Object.keys(state.visitedThemes).length === themeCount;
  const isComplete = Object.keys(visitedThemes).length === themeCount;

  return {
    visitedThemes,
    visitSequence,
    lastVisitedTheme: theme,
    completionPulseId: !wasComplete && isComplete ? state.completionPulseId + 1 : state.completionPulseId,
  };
};

export const useGalaxyStore = create<GalaxyState>((set) => ({
  viewState: 'HOME',
  hoveredPlanet: null,
  activeTheme: null,
  visitedThemes: {},
  visitSequence: [],
  lastVisitedTheme: null,
  completionPulseId: 0,
  coreFireworkId: 0,
  visualMode: readInitialVisualMode(),
  planetPositions: {
    identity: [0, 0, 0],
    creations: [0, 0, 0],
    stack: [0, 0, 0],
    orbit: [0, 0, 0],
    signal: [0, 0, 0],
  },
  transitionStyle: readInitialTransitionStyle(),
  portal: null,
  introPlaying: readIntroPlaying(),
  introPoints: null,
  setViewState: (state) => set({ viewState: state }),
  setHoveredPlanet: (theme) => set({ hoveredPlanet: theme }),
  setActiveTheme: (theme) => set((state) => {
    if (!theme) {
      return { activeTheme: null };
    }

    return {
      ...markThemeVisited(state, theme),
      activeTheme: theme,
    };
  }),
  visitTheme: (theme) => set((state) => markThemeVisited(state, theme)),
  triggerCoreFirework: () => set((state) => ({ coreFireworkId: state.coreFireworkId + 1 })),
  setVisualMode: (mode) => set(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('galaxy-visual-mode', mode);
    }

    return { visualMode: mode };
  }),
  setPlanetPosition: (theme, x, y, z) => set((state) => ({
    planetPositions: {
      ...state.planetPositions,
      [theme]: [x, y, z],
    },
  })),
  setTransitionStyle: (style) => set(() => {
    try {
      window.localStorage.setItem('galaxy-transition-style', style);
    } catch {
      // Private mode: the choice just lasts for this visit.
    }
    return { transitionStyle: style };
  }),
  setPortal: (portal) => set({ portal }),
  setIntroPoints: (points) => set({ introPoints: points }),
  finishIntro: () => set({ introPlaying: false, introPoints: null }),
  raidRequest: 0,
  raid: null,
  requestRaid: () => set((state) => ({ raidRequest: state.raidRequest + 1 })),
  setRaid: (raid) => set({ raid }),
}));
